// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Disposable,
  InputBox,
  QuickInputButton,
  QuickInputButtons,
  QuickPick,
  QuickPickItem,
  Uri,
  window,
  env,
  ProgressLocation,
  ExtensionContext
} from "vscode";
import {
  UserCancelError,
  err,
  FxError,
  InputResult,
  InputResultType,
  MsgLevel,
  OptionItem,
  Result,
  returnSystemError,
  SelectFileConfig,
  SelectFilesConfig,
  SelectFolderConfig,
  SelectOptionConfig,
  SelectOptionsConfig,
  TextInputConfig,
  TimeConsumingTask,
  UIConfig,
  UserInterface
} from "@microsoft/teamsfx-api";
import { ExtensionErrors, ExtensionSource } from "../error";
import { sleep } from "../utils/commonUtils";

export interface FxQuickPickItem extends QuickPickItem {
  id: string;
  data?: unknown;
}

function getOptionItem(item: FxQuickPickItem): OptionItem {
  return {
    id: item.id,
    label: item.label,
    description: item.description,
    detail: item.detail,
    data: item.data
  };
}

function getFxQuickPickItem(item: string | OptionItem): FxQuickPickItem {
  if (typeof item === "string")
    return {
      id: item,
      label: item
    };
  else
    return {
      id: item.id,
      label: item.label,
      description: item.description,
      detail: item.detail,
      data: item.data
    };
}

function toIdSet(items: ({ id: string } | string)[]): Set<string> {
  const set = new Set<string>();
  for (const i of items) {
    if (typeof i === "string") set.add(i);
    else set.add(i.id);
  }
  return set;
}

export function cloneSet(set: Set<string>): Set<string> {
  const res = new Set<string>();
  for (const e of set) res.add(e);
  return res;
}

function isSame(set1: Set<string>, set2: Set<string>): boolean {
  for (const i of set1) {
    if (!set2.has(i)) return false;
  }
  for (const i of set2) {
    if (!set1.has(i)) return false;
  }
  return true;
}

export class VsCodeUI implements UserInterface {
  showSteps = true;
  context:ExtensionContext;
  constructor(context: ExtensionContext){
    this.context = context;
  }

  async selectOption(option: SelectOptionConfig): Promise<InputResult> {
    if (option.options.length === 0) {
      return {
        type: InputResultType.error,
        error: returnSystemError(
          new Error("select option is empty"),
          ExtensionSource,
          ExtensionErrors.EmptySelectOption
        )
      };
    }
    const okButton: QuickInputButton = {
      iconPath: Uri.file(this.context.asAbsolutePath("media/ok.svg")),
      tooltip: "ok"
    };
    const disposables: Disposable[] = [];
    try {
      const quickPick = window.createQuickPick<FxQuickPickItem>();
      quickPick.title = option.title;
      if (option.step && option.step > 1) quickPick.buttons = [QuickInputButtons.Back, okButton];
      else quickPick.buttons = [okButton];
      quickPick.placeholder = option.placeholder;
      quickPick.ignoreFocusOut = true;
      quickPick.matchOnDescription = true;
      quickPick.matchOnDetail = true;
      quickPick.canSelectMany = false;
      if (this.showSteps) {
        quickPick.step = option.step;
        quickPick.totalSteps = option.totalSteps;
      }
      return await new Promise<InputResult>(
        async (resolve): Promise<void> => {
          // set items
          quickPick.items = option.options.map((i: string | OptionItem) => getFxQuickPickItem(i));
          const optionMap = new Map<string, FxQuickPickItem>();
          for (const item of quickPick.items) {
            optionMap.set(item.id, item);
          }
          /// set default
          if (option.default) {
            const defaultItem = optionMap.get(option.default);
            if (defaultItem) {
              const newitems = quickPick.items.filter((i) => i.id !== option.default);
              newitems.unshift(defaultItem);
              quickPick.items = newitems;
            }
          }

          const onDidAccept = async () => {
            let selectedItems = quickPick.selectedItems;
            if (!selectedItems || selectedItems.length === 0) selectedItems = [quickPick.items[0]];
            const item = selectedItems[0];
            let result: string | OptionItem;
            if (
              typeof option.options[0] === "string" ||
              option.returnObject === undefined ||
              option.returnObject === false
            )
              result = item.id;
            else result = getOptionItem(item);
            resolve({ type: InputResultType.sucess, result: result });
          };

          disposables.push(
            quickPick.onDidAccept(onDidAccept),
            quickPick.onDidHide(() => {
              resolve({ type: InputResultType.cancel });
            }),
            quickPick.onDidTriggerButton((button) => {
              if (button === QuickInputButtons.Back) resolve({ type: InputResultType.back });
              else onDidAccept();
            })
          );

          disposables.push(quickPick);
          quickPick.show();
        }
      );
    } finally {
      disposables.forEach((d) => {
        d.dispose();
      });
    }
  }

  async selectOptions(option: SelectOptionsConfig): Promise<InputResult> {
    if (option.options.length === 0) {
      return {
        type: InputResultType.error,
        error: returnSystemError(
          new Error("select option is empty"),
          ExtensionSource,
          ExtensionErrors.EmptySelectOption
        )
      };
    }
    const okButton: QuickInputButton = {
      iconPath: Uri.file(this.context.asAbsolutePath("media/ok.svg")),
      tooltip: "ok"
    };
    const disposables: Disposable[] = [];
    try {
      const quickPick: QuickPick<FxQuickPickItem> = window.createQuickPick<FxQuickPickItem>();
      quickPick.title = option.title;
      if (option.step && option.step > 1) quickPick.buttons = [QuickInputButtons.Back, okButton];
      else quickPick.buttons = [okButton];
      quickPick.placeholder = option.placeholder;
      quickPick.ignoreFocusOut = true;
      quickPick.matchOnDescription = true;
      quickPick.matchOnDetail = true;
      quickPick.canSelectMany = true;
      if (this.showSteps) {
        quickPick.step = option.step;
        quickPick.totalSteps = option.totalSteps;
      }
      const preIds: Set<string> = new Set<string>();
      return await new Promise<InputResult>(
        async (resolve): Promise<void> => {
          // set items
          quickPick.items = option.options.map((i: string | OptionItem) => getFxQuickPickItem(i));
          const optionMap = new Map<string, FxQuickPickItem>();
          for (const item of quickPick.items) {
            optionMap.set(item.id, item);
          }

          // set default values
          if (option.default) {
            const ids = option.default as string[];
            const selectedItems: FxQuickPickItem[] = [];
            preIds.clear();
            for (const id of ids) {
              const item = optionMap.get(id);
              if (item) {
                selectedItems.push(item);
                preIds.add(id);
              }
            }
            quickPick.selectedItems = selectedItems;
          }

          const onDidAccept = async () => {
            const strArray = Array.from(quickPick.selectedItems.map((i) => i.id));
            if (option.validation) {
              const validateRes = await option.validation(strArray);
              if (validateRes) {
                return;
              }
            }
            let result: OptionItem[] | string[] = strArray;
            if (
              typeof option.options[0] === "string" ||
              option.returnObject === undefined ||
              option.returnObject === false
            )
              result = strArray;
            else result = quickPick.selectedItems.map((i) => getOptionItem(i));
            resolve({ type: InputResultType.sucess, result: result });
          };

          disposables.push(
            quickPick.onDidAccept(onDidAccept),
            quickPick.onDidHide(() => {
              resolve({ type: InputResultType.cancel });
            }),
            quickPick.onDidTriggerButton((button) => {
              if (button === QuickInputButtons.Back) resolve({ type: InputResultType.back });
              else onDidAccept();
            })
          );

          if (option.onDidChangeSelection) {
            const changeHandler = async function(items: FxQuickPickItem[]): Promise<any> {
              let currentIds = new Set<string>();
              for (const item of items) {
                currentIds.add(item.id);
              }
              if (option.onDidChangeSelection) {
                const currentClone = cloneSet(currentIds);
                currentIds = await option.onDidChangeSelection(currentIds, preIds);
                const selectedItems: FxQuickPickItem[] = [];
                preIds.clear();
                for (const id of currentIds) {
                  const item = optionMap.get(id);
                  if (item) {
                    selectedItems.push(item);
                    preIds.add(id);
                  }
                }
                if (!isSame(currentClone, currentIds)) {
                  quickPick.selectedItems = selectedItems;
                }
              }
            };
            disposables.push(quickPick.onDidChangeSelection(changeHandler));
          }

          disposables.push(quickPick);
          quickPick.show();
        }
      );
    } finally {
      disposables.forEach((d) => {
        d.dispose();
      });
    }
  }

  async inputText(option: TextInputConfig): Promise<InputResult> {
    const okButton: QuickInputButton = {
      iconPath: Uri.file(this.context.asAbsolutePath("media/ok.svg")),
      tooltip: "ok"
    };
    const disposables: Disposable[] = [];
    try {
      const inputBox: InputBox = window.createInputBox();
      inputBox.title = option.title;
      if (option.step && option.step > 1) inputBox.buttons = [QuickInputButtons.Back, okButton];
      else inputBox.buttons = [okButton];
      inputBox.placeholder = option.placeholder;
      inputBox.value = option.default || "";
      inputBox.ignoreFocusOut = true;
      inputBox.password = option.password === true;
      inputBox.prompt = option.prompt;
      if (this.showSteps) {
        inputBox.step = option.step;
        inputBox.totalSteps = option.totalSteps;
      }
      return await new Promise<InputResult>((resolve): void => {
        const onDidAccept = async () => {
          const validationRes = option.validation
            ? await option.validation(inputBox.value)
            : undefined;
          if (!validationRes) {
            resolve({ type: InputResultType.sucess, result: inputBox.value });
          } else {
            inputBox.validationMessage = validationRes;
          }
        };
        disposables.push(
          inputBox.onDidChangeValue(async (text) => {
            if (option.validation) {
              const validationRes = option.validation ? await option.validation(text) : undefined;
              if (!!validationRes) {
                inputBox.validationMessage = validationRes;
              } else {
                inputBox.validationMessage = undefined;
              }
            }
          }),
          inputBox.onDidAccept(onDidAccept),
          inputBox.onDidHide(() => {
            resolve({ type: InputResultType.cancel });
          }),
          inputBox.onDidTriggerButton((button) => {
            if (button === QuickInputButtons.Back) resolve({ type: InputResultType.back });
            else onDidAccept();
          })
        );
        disposables.push(inputBox);
        inputBox.show();
      });
    } finally {
      disposables.forEach((d) => {
        d.dispose();
      });
    }
  }

  async selectFolder(config: SelectFolderConfig):Promise<InputResult> {
    return this.selectFileInQuickPick(config as UIConfig, false, false, config.default);
  }

  async selectFile(config: SelectFileConfig):Promise<InputResult> {
    return this.selectFileInQuickPick(config as UIConfig, true, false, config.default);
  }

  async selectFiles(config: SelectFilesConfig):Promise<InputResult> {
    return this.selectFileInQuickPick(config as UIConfig, true, true);
  }

  async selectFileInQuickPick(config: UIConfig, file:boolean, many: boolean, defaultValue?: string): Promise<InputResult> {
    const okButton: QuickInputButton = {
      iconPath: Uri.file(this.context.asAbsolutePath("media/ok.svg")),
      tooltip: "ok"
    };
    const disposables: Disposable[] = [];
    try {
      const quickPick: QuickPick<QuickPickItem> = window.createQuickPick();
      quickPick.title = config.title;
      if (config.step && config.step > 1) quickPick.buttons = [QuickInputButtons.Back, okButton];
      else quickPick.buttons = [okButton];
      quickPick.ignoreFocusOut = true;
      quickPick.placeholder = config.placeholder;
      quickPick.matchOnDescription = false;
      quickPick.matchOnDetail = false;
      quickPick.canSelectMany = false;
      if (this.showSteps) {
        quickPick.step = config.step;
        quickPick.totalSteps = config.totalSteps;
      }
      return await new Promise<InputResult>(
        async (resolve): Promise<void> => {
          const onDidAccept = async () => {
            const result = quickPick.items[0].detail;
            if (result && result.length > 0)
              resolve({ type: InputResultType.sucess, result: result });
          };

          disposables.push(
            quickPick.onDidHide(() => {
              resolve({ type: InputResultType.cancel });
            }),
            quickPick.onDidTriggerButton((button) => {
              if (button === QuickInputButtons.Back) resolve({ type: InputResultType.back });
              else onDidAccept();
            })
          );

          /// set items
          quickPick.items = [
            { label: config.prompt || "Select file/folder", detail: defaultValue }
          ];
          const onDidChangeSelection = async function(items: QuickPickItem[]): Promise<any> {
            const defaultUrl = items[0].detail;
            const uriList: Uri[] | undefined = await window.showOpenDialog({
              defaultUri: defaultUrl ? Uri.file(defaultUrl) : undefined,
              canSelectFiles: file,
              canSelectFolders: !file,
              canSelectMany: many,
              title: config.title
            });
            if (uriList && uriList.length > 0) {
              if (many) {
                const results = uriList.map((u) => u.fsPath);
                const resultString = results.join(";");
                quickPick.items = [
                  { label: config.prompt || "Select file/folder", detail: resultString }
                ];
                resolve({ type: InputResultType.sucess, result: results });
              } else {
                const result = uriList[0].fsPath;
                quickPick.items = [
                  { label: config.prompt || "Select file/folder", detail: result }
                ];
                resolve({ type: InputResultType.sucess, result: result });
              }
            }
          };
          disposables.push(quickPick.onDidChangeSelection(onDidChangeSelection));
          disposables.push(quickPick);
          quickPick.show();

          const uriList: Uri[] | undefined = await window.showOpenDialog({
            defaultUri: defaultValue ? Uri.file(defaultValue) : undefined,
            canSelectFiles: file,
            canSelectFolders: !file,
            canSelectMany: many,
            title: config.title
          });
          if (uriList && uriList.length > 0) {
            if (many) {
              const results = uriList.map((u) => u.fsPath);
              const resultString = results.join(";");
              quickPick.items = [
                { label: config.prompt || "Select file/folder", detail: resultString }
              ];
              resolve({ type: InputResultType.sucess, result: results });
            } else {
              const result = uriList[0].fsPath;
              quickPick.items = [{ label: config.prompt || "Select file/folder", detail: result }];
              resolve({ type: InputResultType.sucess, result: result });
            }
          }
        }
      );
    } finally {
      disposables.forEach((d) => {
        d.dispose();
      });
    }
  }

  async openUrl(link: string): Promise<boolean> {
    const uri = Uri.parse(link);
    return env.openExternal(uri);
  }

  async showMessage(
    level: MsgLevel,
    message: string,
    modal: boolean,
    ...items: string[]
  ): Promise<string | undefined> {
    const option = { modal: modal };
    if (level === MsgLevel.Info) return window.showInformationMessage(message, option, ...items);
    else if (level === MsgLevel.Warning)
      return window.showWarningMessage(message, option, ...items);
    else if (level === MsgLevel.Error) return window.showErrorMessage(message, option, ...items);
  }

  async runWithProgress<T>(task: TimeConsumingTask<T>): Promise<Result<T, FxError>> {
    return new Promise<Result<T, FxError>>(async (resolve) => {
      window.withProgress(
        {
          location: ProgressLocation.Notification,
          title: task.name,
          cancellable: true
        },
        async (progress, token): Promise<any> => {
          token.onCancellationRequested(() => {
            task.cancel();
            resolve(err(UserCancelError));
          });
          const startTime = new Date().getTime();
          const res = task.run();
          progress.report({ increment: 0 });
          let lastLength = 0;
          res.then((v:any) => { 
            resolve(v) 
          }).catch((e:any) => { 
            resolve(err(e))
          });
          while ((task.total === 0 || task.current < task.total) && !task.isCanceled) {
            const inc = task.current - lastLength;
            if (inc > 0) {
              const elapsedTime = new Date().getTime() - startTime;
              const remainingTime = (elapsedTime * (task.total - task.current)) / task.current;
              progress.report({
                increment: (inc * 100) / task.total,
                message: `progress:${Math.round(
                  (task.current * 100) / task.total
                )} %, remaining time: ${Math.round(remainingTime)} ms (${task.message})`
              });
              lastLength += inc;
            }
            await sleep(100);
          }
          if (task.isCanceled) resolve(err(UserCancelError));
        }
      );
    });
  }
}
