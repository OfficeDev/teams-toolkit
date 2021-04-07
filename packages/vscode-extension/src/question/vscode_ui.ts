// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Option, OptionItem, returnSystemError, StaticOption } from "fx-api";
import { Disposable, InputBox, QuickInputButtons, QuickPick, QuickPickItem, window } from "vscode";
import { ExtensionErrors, ExtensionSource } from "../error";
import { InputResult, InputResultType } from "./types";

export interface FxQuickPickOption {
  title: string;
  items: StaticOption;
  canSelectMany: boolean;
  defaultValue?: string | string[];
  placeholder?: string;
  validation?: (input: string | string[]) => Promise<string | undefined | null>;
  backButton?: boolean;
  returnObject?: boolean;
}

export interface FxInputBoxOption {
  title: string;
  password: boolean;
  defaultValue?: string;
  placeholder?: string;
  prompt?: string;
  validation?: (input: string | string[]) => Promise<string | undefined | null>;
  backButton?: boolean;
}

export interface FxQuickPickItem extends QuickPickItem {
  id: string;
  data?: any;
}

export async function showQuickPick(option: FxQuickPickOption): Promise<InputResult> {
  const disposables: Disposable[] = [];
  try {
    const quickPick: QuickPick<QuickPickItem> = window.createQuickPick();
    disposables.push(quickPick);
    quickPick.title = option.title;
    if (option.backButton) quickPick.buttons = [QuickInputButtons.Back];
    quickPick.placeholder = option.placeholder;
    quickPick.ignoreFocusOut = true;
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;
    quickPick.canSelectMany = option.canSelectMany;

    return await new Promise<InputResult>(
      async (resolve): Promise<void> => {
        disposables.push(
          quickPick.onDidAccept(async () => {
            if (option.canSelectMany) {
              const strArray = Array.from(
                quickPick.selectedItems.map((i) => {
                  return i.label;
                })
              );
              let result: OptionItem[] | string[] = strArray;
              if (option.returnObject) {
                result = quickPick.selectedItems.map((i) => {
                  const fi:FxQuickPickItem = i as FxQuickPickItem;
                  const item: OptionItem = {
                    id: fi.id,
                    label: fi.label,
                    description: fi.description,
                    detail: fi.detail,
                    data: fi.data
                  };
                  return item;
                });
              }
              resolve({
                type: InputResultType.sucess,
                result: result
              });
            } else {
              const item: FxQuickPickItem = quickPick.selectedItems[0] as FxQuickPickItem;
              let result: string | OptionItem = item.label;
              if (option.returnObject) {
                result = {
                  id: item.id,
                  label: item.label,
                  description: item.description,
                  detail: item.detail,
                  data: item.data
                };
              }
              resolve({ type: InputResultType.sucess, result: result });
            }
          }),
          quickPick.onDidChangeSelection(async (items) => {
            const strArray = Array.from(
              quickPick.selectedItems.map((i) => {
                return i.label;
              })
            );
            if (option.validation) {
              const error = await option.validation(strArray);
              if (error) {
                quickPick.title = option.title + ` (validation failed: ${error})`;
                return;
              } else {
                quickPick.title = option.title;
              }
            }
          }),
          quickPick.onDidHide(() => {
            resolve({ type: InputResultType.cancel });
          })
        );
        if (option.backButton) {
          disposables.push(
            quickPick.onDidTriggerButton((_btn) => {
              resolve({ type: InputResultType.back });
            })
          );
        }
        try {
          const isStringArray = !!(typeof option.items[0] === "string");
          /// set items
          if (isStringArray) {
            quickPick.items = (option.items as string[]).map((i: string) => {
              return { label: i };
            });
          } else {
            quickPick.items = (option.items as OptionItem[]).map((i: OptionItem) => {
              return { label: i.label, description: i.description, detail: i.detail, data: i.data };
            });
          }

          /// set default values
          if (option.defaultValue) {
            if (option.canSelectMany) {
              const defaultStringArrayValue = option.defaultValue as string[];
              quickPick.selectedItems = quickPick.items.filter((i: QuickPickItem) =>
                defaultStringArrayValue.includes(i.label)
              );
            } else {
              const defaultStringValue = option.defaultValue as string;
              const newitems = quickPick.items.filter(
                (item: QuickPickItem) => item.label !== defaultStringValue
              );
              for (const item of quickPick.items) {
                if (item.label === defaultStringValue) {
                  newitems.unshift(item);
                  break;
                }
              }
              quickPick.items = newitems;
            }
          }
          quickPick.show();
        } catch (err) {
          resolve({
            type: InputResultType.error,
            error: returnSystemError(err, ExtensionSource, ExtensionErrors.UnknwonError)
          });
        }
      }
    );
  } finally {
    disposables.forEach((d) => {
      d.dispose();
    });
  }
}

export async function showInputBox(option: FxInputBoxOption): Promise<InputResult> {
  const disposables: Disposable[] = [];
  let isPrompting = false;
  try {
    const inputBox: InputBox = window.createInputBox();
    disposables.push(inputBox);
    inputBox.title = option.title;
    if (option.backButton) inputBox.buttons = [QuickInputButtons.Back];
    inputBox.value = option.defaultValue || "";
    inputBox.ignoreFocusOut = true;
    inputBox.password = option.password;
    inputBox.placeholder = option.placeholder;
    inputBox.prompt = option.prompt;
    let latestValidation: Promise<string | undefined | null> = option.validation
      ? Promise.resolve(await option.validation(inputBox.value))
      : Promise.resolve("");
    return await new Promise<InputResult>((resolve, reject): void => {
      disposables.push(
        inputBox.onDidChangeValue(async (text) => {
          if (option.validation) {
            const validationRes: Promise<string | undefined | null> = Promise.resolve(
              await option.validation(text)
            );
            latestValidation = validationRes;
            const message: string | undefined | null = await validationRes;
            if (validationRes === latestValidation) {
              inputBox.validationMessage = message || "";
            }
          }
        }),
        inputBox.onDidAccept(async () => {
          // Run final validation and resolve if value passes
          inputBox.enabled = false;
          inputBox.busy = true;
          const message: string | undefined | null = await latestValidation;
          if (!message) {
            resolve({ type: InputResultType.sucess, result: inputBox.value });
          } else {
            inputBox.validationMessage = message;
          }
          inputBox.enabled = true;
          inputBox.busy = false;
        }),
        // inputBox.onDidTriggerButton((_btn) => {
        //   resolve({ type: InputResultType.back });
        // }),
        inputBox.onDidHide(() => {
          resolve({ type: InputResultType.cancel });
        })
      );
      if (option.backButton) {
        disposables.push(
          inputBox.onDidTriggerButton((_btn) => {
            resolve({ type: InputResultType.back });
          })
        );
      }
      inputBox.show();
      isPrompting = true;
    });
  } finally {
    isPrompting = false;
    disposables.forEach((d) => {
      d.dispose();
    });
  }
}
