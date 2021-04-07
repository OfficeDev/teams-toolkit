// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
 
import { Disposable, InputBox, QuickInputButtons, QuickPick, QuickPickItem, Uri, window } from "vscode";
import { FxInputBoxOption, FxOpenDialogOption, FxQuickPickOption, InputResult, InputResultType, OptionItem, returnSystemError, UserInterface } from "fx-api";
import { ExtensionErrors, ExtensionSource } from "../error";
 

 
export interface FxQuickPickItem extends QuickPickItem {
  id: string;
  data?: unknown;
}

export class VsCodeUI implements UserInterface{
  async showQuickPick (option: FxQuickPickOption) : Promise<InputResult>{
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
              const selectedItems = quickPick.selectedItems as FxQuickPickItem[];
              if (option.canSelectMany) {
                const strArray = Array.from(selectedItems.map((i) => i.id));
                let result: OptionItem[] | string[] = strArray;
                if (option.returnObject) {
                  result = selectedItems.map((i) => {
                    const item: OptionItem = {
                      id: i.id,
                      label: i.label,
                      description: i.description,
                      detail: i.detail,
                      data: i.data
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
                let result: string | OptionItem = item.id;
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
            quickPick.onDidHide(() => {
              resolve({ type: InputResultType.cancel });
            })
          );
          if(option.backButton) {
            disposables.push(
              quickPick.onDidTriggerButton((button) => {
                resolve({ type: InputResultType.back });
              })
            );
          }
          
          try {
            const optionIsString = !!(typeof option.items[0] === "string");
            /// set items
            if (optionIsString) {
              quickPick.items = (option.items as string[]).map((i: string) => {
                return { label: i, id: i };
              });
            } else {
              quickPick.items = (option.items as OptionItem[]).map((i: OptionItem) => {
                return {
                  id: i.id,
                  label: i.label,
                  description: i.description,
                  detail: i.detail,
                  data: i.data
                };
              });
            }
            
            const items = quickPick.items as FxQuickPickItem[];
            const optionMap = new Map<string, FxQuickPickItem>();
            for(const item of items){
              optionMap.set(item.id, item);
            }

            /// set default values
            if (option.defaultValue) {
              const items = quickPick.items as FxQuickPickItem[];
              if (option.canSelectMany) {
                const ids = option.defaultValue as string[];
                quickPick.selectedItems = ids.map(id=>optionMap.get(id)!);
              } else {
                const defaultStringValue = option.defaultValue as string;
                const newitems = items.filter((i) => i.id !== defaultStringValue);
                for (const i of items) {
                  if (i.id === defaultStringValue) {
                    newitems.unshift(i);
                    break;
                  }
                }
                quickPick.items = newitems;
              }
            }

            if(option.onDidChangeSelection){
              const changeHandler = async function(items:QuickPickItem[]):Promise<any>{
                const optionItems:OptionItem[] = items.map(i=>{
                  const fxitem:FxQuickPickItem = i as FxQuickPickItem;
                  return {
                    id: fxitem.id,
                    label: fxitem.label,
                    description: fxitem.description,
                    detail: fxitem.detail,
                    data: fxitem.data
                  };
                });
                const oldIds = quickPick.selectedItems.map(i=>{return (i as FxQuickPickItem).id;}).sort();
                if(option.onDidChangeSelection){
                  const newIds:string[] = (await option.onDidChangeSelection(optionItems)).sort();
                  if(oldIds.join(",") !== newIds.join(",")){
                    quickPick.selectedItems = newIds.map(id=>optionMap.get(id)!);
                  }
                }
              };
              disposables.push(
                quickPick.onDidChangeSelection(changeHandler)
              );
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


  async showInputBox(option: FxInputBoxOption) : Promise<InputResult>{
    const disposables: Disposable[] = [];
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
      if(option.number){
        const numberValidation = async function(input:string):Promise<string|undefined>{
          if(!input || input.trim() === "" ||isNaN(Number(input))) return `'${input}' is not a valid number`;
          return undefined;
        };
        const oldValidation = option.validation;
        const newValidation = async function(input:string):Promise<string|undefined>{
          const res = oldValidation ? await oldValidation(input): undefined;
          if(res !== undefined) return res;
          return await numberValidation(input);
        };
        option.validation = newValidation;
      }
      return await new Promise<InputResult>((resolve): void => {
        disposables.push(
          inputBox.onDidChangeValue(async (text) => {
            if (option.validation) {
              const validationRes = option.validation ? await option.validation(text) : undefined;
              if (!!validationRes) {
                inputBox.validationMessage = validationRes;
              }
              else{
                inputBox.validationMessage = undefined;
              }
            }
          }),
          inputBox.onDidAccept(async () => {
            const validationRes = option.validation ? await option.validation(inputBox.value) : undefined;
            if (!validationRes) {
              resolve({ type: InputResultType.sucess, result: inputBox.value });
            } else {
              inputBox.validationMessage = validationRes;
            }
          }),
          inputBox.onDidHide(() => {
            resolve({ type: InputResultType.cancel });
          })
        );
        if (option.backButton) {
          disposables.push(
            inputBox.onDidTriggerButton((button) => {
              resolve({ type: InputResultType.back });
            })
          );
        }
        inputBox.show();
      });
    } finally {
      disposables.forEach((d) => {
        d.dispose();
      });
    }
  }

  async showOpenDialog (option: FxOpenDialogOption):Promise<InputResult>{
    while (true) {
      const uri = await window.showOpenDialog({
        defaultUri: option.defaultUri ? Uri.file(option.defaultUri) : undefined,
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        title: option.title
      });
      const res = uri && uri.length > 0 ? uri[0].fsPath : undefined;
      if (!res) {
        return { type: InputResultType.cancel };
      }
      if(!option.validation){
        return { type: InputResultType.sucess, result: res };
      }
      const validationRes = await option.validation(res);
      if (!validationRes) {
        return { type: InputResultType.sucess, result: res };
      }
      else {
        await window.showErrorMessage(validationRes);
      }
    }
  }
}
  
