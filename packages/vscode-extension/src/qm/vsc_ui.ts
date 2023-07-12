// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { find, remove } from "lodash";
import * as path from "path";
import {
  commands,
  Disposable,
  env,
  ExtensionContext,
  extensions,
  InputBox,
  QuickInputButton,
  QuickInputButtons,
  QuickPick,
  QuickPickItem,
  QuickPickItemKind,
  Terminal,
  ThemeIcon,
  Uri,
  window,
  workspace,
} from "vscode";

import {
  Colors,
  err,
  ExecuteFuncConfig,
  FxError,
  InputResult,
  InputTextConfig,
  InputTextResult,
  IProgressHandler,
  MultiSelectConfig,
  MultiSelectResult,
  ok,
  OptionItem,
  Result,
  SelectFileConfig,
  SelectFileResult,
  SelectFilesConfig,
  SelectFilesResult,
  SelectFolderConfig,
  SelectFolderResult,
  SingleFileOrInputConfig,
  SingleSelectConfig,
  SingleSelectResult,
  StaticOptions,
  SystemError,
  UIConfig,
  UserInteraction,
} from "@microsoft/teamsfx-api";
import { UserCancelError, assembleError, loadingOptionsPlaceholder } from "@microsoft/teamsfx-core";
import * as packageJson from "../../package.json";
import { TerminalName } from "../constants";
import { ExtensionErrors, ExtensionSource } from "../error";
import { showOutputChannel } from "../handlers";
import { ProgressHandler } from "../progressHandler";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { TelemetryEvent, TelemetryProperty } from "../telemetry/extTelemetryEvents";
import { sleep } from "../utils/commonUtils";
import { getDefaultString, localize } from "../utils/localizeUtils";

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
    data: item.data,
  };
}

function convertToFxQuickPickItems(options: StaticOptions): FxQuickPickItem[] {
  if (options && options.length > 0 && typeof options[0] === "string") {
    return (options as string[]).map((option: string) => {
      return { id: option, label: option };
    });
  } else {
    const result: FxQuickPickItem[] = [];
    const candidates = [...options];
    while (candidates.length > 0) {
      const groupName = (candidates[0] as OptionItem).groupName;
      const group = remove(
        candidates as OptionItem[],
        (option: OptionItem) => option.groupName === groupName
      );
      if (groupName) {
        result.push({
          id: groupName,
          label: groupName,
          kind: QuickPickItemKind.Separator,
        });
      }
      result.push(
        ...group.map((option) => {
          return {
            id: option.id,
            label: option.label,
            description: option.description,
            detail: option.detail,
            data: option.data,
            buttons: option.buttons?.map((button) => {
              return { iconPath: new ThemeIcon(button.iconPath), tooltip: button.tooltip };
            }),
          };
        })
      );
    }
    return result;
  }
}

function cloneSet(set: Set<string>): Set<string> {
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

const internalUIError = new SystemError("UI", "InternalError", "VS Code failed to operate.");

export class VsCodeUI implements UserInteraction {
  context: ExtensionContext;
  constructor(context: ExtensionContext) {
    this.context = context;
  }

  async selectOption(option: SingleSelectConfig): Promise<Result<SingleSelectResult, FxError>> {
    if (typeof option.options === "object" && option.options.length === 0) {
      return err(
        new SystemError(
          ExtensionSource,
          ExtensionErrors.EmptySelectOption,
          getDefaultString("teamstoolkit.qm.emptySelection"),
          localize("teamstoolkit.qm.emptySelection")
        )
      );
    }
    const disposables: Disposable[] = [];
    try {
      const quickPick = window.createQuickPick<FxQuickPickItem>();
      quickPick.title = option.title;
      const buttons: QuickInputButton[] = option.buttons
        ? option.buttons.map((button) => {
            return {
              iconPath: new ThemeIcon(button.icon),
              tooltip: button.tooltip,
            } as QuickInputButton;
          })
        : [];
      if (option.step && option.step > 1) {
        quickPick.buttons = [QuickInputButtons.Back, ...buttons];
      } else {
        quickPick.buttons = buttons;
      }
      quickPick.placeholder = option.placeholder;
      quickPick.ignoreFocusOut = true;
      quickPick.matchOnDescription = true;
      quickPick.matchOnDetail = true;
      quickPick.canSelectMany = false;
      return await new Promise<Result<SingleSelectResult, FxError>>(
        async (resolve): Promise<void> => {
          // set items
          let options: StaticOptions = [];
          let isSkip = false;
          if (typeof option.options === "function") {
            quickPick.busy = true;
            quickPick.placeholder = loadingOptionsPlaceholder();
            option
              .options()
              .then((results) => {
                options = results;
                quickPick.items = convertToFxQuickPickItems(options);
                quickPick.busy = false;
                quickPick.placeholder = option.placeholder;
                if (option.skipSingleOption && options.length === 1) {
                  quickPick.selectedItems = [quickPick.items[0]];
                  isSkip = true;
                  onDidAccept();
                }
              })
              .catch((error) => {
                resolve(err(assembleError(error)));
              });
          } else {
            options = option.options as StaticOptions;
          }
          quickPick.items = convertToFxQuickPickItems(options);
          // set default
          if (option.default) {
            // let defaultOption: string | OptionItem | undefined;
            if (options && options.length > 0 && typeof options[0] === "string") {
              const defaultOption = (options as string[]).find((o) => o == option.default);
              if (defaultOption) {
                const newItems = (options as string[]).filter((o) => o != option.default);
                newItems.unshift(defaultOption);
                quickPick.items = convertToFxQuickPickItems(newItems);
              }
            } else {
              const defaultOption = (options as OptionItem[]).find((o) => o.id == option.default);
              if (defaultOption) {
                const newItems = (options as OptionItem[]).filter((o) => o.id != option.default);
                newItems.unshift(defaultOption);
                quickPick.items = convertToFxQuickPickItems(newItems);
              }
            }
          }

          const onDidAccept = async () => {
            const selectedItems = quickPick.selectedItems;
            if (selectedItems && selectedItems.length > 0) {
              const item = selectedItems[0];
              let result: string | OptionItem;
              if (
                typeof options[0] === "string" ||
                option.returnObject === undefined ||
                option.returnObject === false
              ) {
                result = item.id;
                if (option.validation) {
                  try {
                    const validateRes = await option.validation(result);
                    if (validateRes) {
                      return;
                    }
                  } catch (e) {
                    resolve(err(assembleError(e)));
                  }
                }
              } else result = getOptionItem(item);
              resolve(ok({ type: isSkip ? "skip" : "success", result: result }));
            }
          };

          disposables.push(
            quickPick.onDidAccept(onDidAccept),
            quickPick.onDidHide(() => {
              resolve(err(new UserCancelError("VSC")));
            }),
            quickPick.onDidTriggerButton((button) => {
              if (button === QuickInputButtons.Back) resolve(ok({ type: "back" }));
              else if (option.buttons && buttons.indexOf(button) !== -1) {
                const curButton = option.buttons?.find((btn) => {
                  return (
                    btn.icon === (button.iconPath as ThemeIcon).id && btn.tooltip === button.tooltip
                  );
                });
                if (curButton) {
                  commands.executeCommand(curButton.command);
                }
              } else {
                quickPick.selectedItems = quickPick.activeItems;
                onDidAccept();
              }
            }),
            quickPick.onDidTriggerItemButton((event) => {
              const itemOptions: StaticOptions = options;
              if (itemOptions.length > 0 && typeof itemOptions[0] === "string") {
                return;
              }
              const triggerItem: OptionItem | undefined = (itemOptions as OptionItem[]).find(
                (singleOption: string | OptionItem) => {
                  if (typeof singleOption !== "string") {
                    return (singleOption as OptionItem).id === event.item.id;
                  }
                }
              );
              if (triggerItem) {
                const triggerButton = triggerItem.buttons?.find((button) => {
                  return button.iconPath === (event.button.iconPath as ThemeIcon).id;
                });
                if (triggerButton) {
                  commands.executeCommand(triggerButton.command, event.item);
                }
              }
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

  async selectOptions(option: MultiSelectConfig): Promise<Result<MultiSelectResult, FxError>> {
    if (typeof option.options === "object" && option.options.length === 0) {
      return err(
        new SystemError(
          ExtensionSource,
          ExtensionErrors.EmptySelectOption,
          getDefaultString("teamstoolkit.qm.emptySelection"),
          localize("teamstoolkit.qm.emptySelection")
        )
      );
    }
    const disposables: Disposable[] = [];
    try {
      const quickPick: QuickPick<FxQuickPickItem> = window.createQuickPick<FxQuickPickItem>();
      quickPick.title = option.title;
      if (option.step && option.step > 1) {
        quickPick.buttons = [QuickInputButtons.Back];
      }
      quickPick.placeholder = option.placeholder
        ? option.placeholder + localize("teamstoolkit.qm.multiSelectKeyboard")
        : localize("teamstoolkit.qm.multiSelectKeyboard");
      quickPick.ignoreFocusOut = true;
      quickPick.matchOnDescription = true;
      quickPick.matchOnDetail = true;
      quickPick.canSelectMany = true;
      const preIds: Set<string> = new Set<string>();
      return await new Promise<Result<MultiSelectResult, FxError>>(
        async (resolve): Promise<void> => {
          // set items
          let options: StaticOptions = [];
          let isSkip = false;
          if (typeof option.options === "function") {
            quickPick.busy = true;
            quickPick.placeholder = loadingOptionsPlaceholder();
            option
              .options()
              .then((results) => {
                options = results;
                quickPick.items = convertToFxQuickPickItems(options);
                quickPick.busy = false;
                quickPick.placeholder = option.placeholder;
                if (option.skipSingleOption && options.length === 1) {
                  quickPick.selectedItems = [quickPick.items[0]];
                  isSkip = true;
                  onDidAccept();
                }
              })
              .catch((error) => {
                resolve(err(assembleError(error)));
              });
          } else {
            options = option.options as StaticOptions;
          }
          quickPick.items = convertToFxQuickPickItems(options);
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
              typeof options[0] === "string" ||
              option.returnObject === undefined ||
              option.returnObject === false
            )
              result = strArray;
            else result = quickPick.selectedItems.map((i) => getOptionItem(i));
            resolve(ok({ type: isSkip ? "skip" : "success", result: result }));
          };

          disposables.push(
            quickPick.onDidAccept(onDidAccept),
            quickPick.onDidHide(() => {
              resolve(err(new UserCancelError("VSC")));
            }),
            quickPick.onDidTriggerButton((button) => {
              if (button === QuickInputButtons.Back) resolve(ok({ type: "back" }));
              else onDidAccept();
            })
          );

          if (option.onDidChangeSelection) {
            const changeHandler = async function (items: readonly FxQuickPickItem[]): Promise<any> {
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

  async inputText(option: InputTextConfig): Promise<Result<InputTextResult, FxError>> {
    const disposables: Disposable[] = [];
    try {
      const inputBox: InputBox = window.createInputBox();
      inputBox.title = option.title;
      if (option.step && option.step > 1) {
        inputBox.buttons = [QuickInputButtons.Back];
      }
      inputBox.placeholder = option.placeholder;
      inputBox.value = option.default || "";
      inputBox.ignoreFocusOut = true;
      inputBox.password = option.password === true;
      inputBox.prompt = option.prompt;
      return await new Promise<Result<InputTextResult, FxError>>((resolve): void => {
        const onDidAccept = async () => {
          const validationRes = option.validation
            ? await option.validation(inputBox.value)
            : undefined;
          if (!validationRes) {
            resolve(ok({ type: "success", result: inputBox.value }));
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
            resolve(err(new UserCancelError("VSC")));
          }),
          inputBox.onDidTriggerButton((button) => {
            if (button === QuickInputButtons.Back) resolve(ok({ type: "back" }));
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

  async selectFolder(config: SelectFolderConfig): Promise<Result<SelectFolderResult, FxError>> {
    const disposables: Disposable[] = [];
    try {
      const quickPick = window.createQuickPick<FxQuickPickItem>();
      quickPick.title = config.title;
      if (config.step && config.step > 1) {
        quickPick.buttons = [QuickInputButtons.Back];
      }
      quickPick.placeholder = config.placeholder;
      quickPick.ignoreFocusOut = true;
      quickPick.matchOnDescription = true;
      quickPick.matchOnDetail = true;
      quickPick.canSelectMany = false;
      return await new Promise<Result<SelectFolderResult, FxError>>(
        async (resolve): Promise<void> => {
          // set options
          quickPick.items = [
            ...(config.default
              ? [
                  {
                    id: "default",
                    label: localize("teamstoolkit.qm.defaultFolder"),
                    description: config.default,
                  },
                ]
              : []),
            {
              id: "browse",
              label: `$(folder) ${localize("teamstoolkit.qm.browse")}`,
            },
          ];

          let hideByDialog = false;
          const onDidAccept = async () => {
            const selectedItems = quickPick.selectedItems;
            if (selectedItems && selectedItems.length > 0) {
              const item = selectedItems[0];
              ExtTelemetry.sendTelemetryEvent(TelemetryEvent.SelectFolder, {
                [TelemetryProperty.SelectedOption]: item.id,
              });
              if (item.id === "default") {
                resolve(ok({ type: "success", result: config.default }));
              } else {
                hideByDialog = true;
                const uriList: Uri[] | undefined = await window.showOpenDialog({
                  defaultUri: config.default ? Uri.file(config.default) : undefined,
                  canSelectFiles: false,
                  canSelectFolders: true,
                  canSelectMany: false,
                  title: config.title,
                });
                if (uriList && uriList.length > 0) {
                  const result = uriList[0].fsPath;
                  resolve(ok({ type: "success", result: result }));
                } else {
                  resolve(err(new UserCancelError("VSC")));
                }
              }
            }
          };

          disposables.push(
            quickPick.onDidAccept(onDidAccept),
            quickPick.onDidHide(() => {
              if (!hideByDialog) {
                resolve(err(new UserCancelError("VSC")));
              }
            }),
            quickPick.onDidTriggerButton((button) => {
              if (button === QuickInputButtons.Back) resolve(ok({ type: "back" }));
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

  async selectFile(config: SelectFileConfig): Promise<Result<SelectFileResult, FxError>> {
    return this.selectFileInQuickPick(config, "file", config.default);
  }

  async selectFiles(config: SelectFilesConfig): Promise<Result<SelectFilesResult, FxError>> {
    return this.selectFileInQuickPick(
      config,
      "files",
      config.default ? config.default.join(";") : undefined
    );
  }

  async selectFileInQuickPick(
    config: SelectFileConfig,
    type: "file" | "files",
    defaultValue?: string
  ): Promise<Result<SelectFileResult, FxError>>;
  async selectFileInQuickPick(
    config: SelectFilesConfig,
    type: "file" | "files",
    defaultValue?: string
  ): Promise<Result<SelectFilesResult, FxError>>;
  async selectFileInQuickPick(
    config: UIConfig<any> & {
      filters?: { [name: string]: string[] };
      possibleFiles?: {
        id: string;
        label: string;
        description?: string;
      }[];
    },
    type: "file" | "files",
    defaultValue?: string
  ): Promise<Result<InputResult<string[] | string>, FxError>> {
    if (config.possibleFiles) {
      if (config.possibleFiles.find((o) => o.id === "browse" || o.id === "default")) {
        return Promise.resolve(
          err(
            new SystemError(
              "UI",
              "InvalidInput",
              'Possible files should not contain item with id "browse" or "default".'
            )
          )
        );
      }
    }
    /// TODO: use generic constraints.
    const disposables: Disposable[] = [];
    try {
      const quickPick: QuickPick<FxQuickPickItem> = window.createQuickPick();
      quickPick.title = config.title;
      if (config.step && config.step > 1) {
        quickPick.buttons = [QuickInputButtons.Back];
      }
      quickPick.ignoreFocusOut = true;
      quickPick.placeholder = config.placeholder;
      quickPick.matchOnDescription = false;
      quickPick.matchOnDetail = false;
      quickPick.canSelectMany = false;
      let fileSelectorIsOpen = false;
      return await new Promise(async (resolve) => {
        // set options
        quickPick.items = [
          ...(config.possibleFiles
            ? config.possibleFiles
            : defaultValue
            ? [
                {
                  id: "default",
                  label: `$(file) ${path.basename(defaultValue)}`,
                  description: path.dirname(defaultValue),
                },
              ]
            : []),
          {
            id: "browse",
            label: `$(file) ${localize("teamstoolkit.qm.browse")}`,
          },
        ];

        const onDidAccept = async () => {
          const selectedItems = quickPick.selectedItems;
          if (selectedItems && selectedItems.length > 0) {
            const item = selectedItems[0];
            if (item.id === "default") {
              resolve(ok({ type: "success", result: config.default }));
            } else if (item.id === "browse") {
              fileSelectorIsOpen = true;
              const uriList: Uri[] | undefined = await window.showOpenDialog({
                defaultUri: config.default ? Uri.file(config.default) : undefined,
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: type === "files",
                filters: config.filters,
                title: config.title,
              });
              if (uriList && uriList.length > 0) {
                if (type === "files") {
                  const results = uriList.map((u) => u.fsPath);
                  resolve(ok({ type: "success", result: results }));
                } else {
                  const result = uriList[0].fsPath;
                  resolve(ok({ type: "success", result: result }));
                }
              } else {
                resolve(err(new UserCancelError("VSC")));
              }
            } else {
              resolve(
                ok({
                  type: "success",
                  result: config.possibleFiles?.find((f) => f.id === item.id)?.id,
                })
              );
            }
          }
        };

        disposables.push(
          quickPick.onDidAccept(onDidAccept),
          quickPick.onDidHide(() => {
            if (fileSelectorIsOpen === false) resolve(err(new UserCancelError("VSC")));
          }),
          quickPick.onDidTriggerButton((button) => {
            if (button === QuickInputButtons.Back) resolve(ok({ type: "back" }));
          })
        );

        disposables.push(quickPick);
        quickPick.show();
      });
    } finally {
      disposables.forEach((d) => {
        d.dispose();
      });
    }
  }

  async openUrl(link: string): Promise<Result<boolean, FxError>> {
    const uri = Uri.parse(link);
    return new Promise(async (resolve) => {
      env.openExternal(uri).then((v) => {
        if (v) resolve(ok(v));
        else resolve(err(internalUIError));
      });
    });
  }

  async selectFileOrInput(
    config: SingleFileOrInputConfig
  ): Promise<Result<InputResult<string>, FxError>> {
    const selectFileConfig: SelectFileConfig = {
      ...config,
      possibleFiles: [config.inputOptionItem],
    };

    while (true) {
      const selectFileOrItemRes = await this.selectFile(selectFileConfig);
      if (selectFileOrItemRes.isOk()) {
        if (selectFileOrItemRes.value.result === config.inputOptionItem.id) {
          ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ContinueToInput, {
            [TelemetryProperty.SelectedOption]: selectFileOrItemRes.value.result,
          });
          const inputRes = await this.inputText(config.inputBoxConfig);
          if (inputRes.isOk()) {
            if (inputRes.value.type === "back") continue;
            return ok(inputRes.value);
          } else {
            return err(inputRes.error);
          }
        } else {
          return ok(selectFileOrItemRes.value);
        }
      } else {
        return err(selectFileOrItemRes.error);
      }
    }
  }

  public async showMessage(
    level: "info" | "warn" | "error",
    message: string,
    modal: boolean,
    ...items: string[]
  ): Promise<Result<string | undefined, FxError>>;

  public async showMessage(
    level: "info" | "warn" | "error",
    message: Array<{ content: string; color: Colors }>,
    modal: boolean,
    ...items: string[]
  ): Promise<Result<string | undefined, FxError>>;

  async showMessage(
    level: "info" | "warn" | "error",
    message: string | Array<{ content: string; color: Colors }>,
    modal: boolean,
    ...items: string[]
  ): Promise<Result<string | undefined, FxError>> {
    if (message instanceof Array) {
      message = message.map((x) => x.content).join("");
    }
    return new Promise(async (resolve) => {
      const option = { modal: modal };
      try {
        let promise: Thenable<string | undefined>;
        switch (level) {
          case "info": {
            promise = window.showInformationMessage(message as string, option, ...items);
            break;
          }
          case "warn": {
            promise = window.showWarningMessage(message as string, option, ...items);
            break;
          }
          case "error":
            promise = window.showErrorMessage(message as string, option, ...items);
        }
        promise.then((v) => {
          if (v) resolve(ok(v));
          else resolve(err(new UserCancelError("VSC")));
        });
      } catch (error) {
        resolve(err(assembleError(error)));
      }
    });
  }

  public createProgressBar(title: string, totalSteps: number): IProgressHandler {
    return new ProgressHandler(title, totalSteps);
  }

  async reload(): Promise<Result<boolean, FxError>> {
    // The following code only fixes the bug that cause telemetry event lost for projectMigrator().
    // When this reload() function has more users, they may need to dispose() more resources that allocated in activate().
    const extension = extensions.getExtension(`${packageJson.publisher}.${packageJson.name}`);
    if (!extension?.isActive) {
      // When our extension is not activated, we can determine this is in the vscode extension activate() context.
      // Since we are not activated yet, vscode will not deactivate() and dispose() our resourses (which have been allocated in activate()).
      // This may cause resource leaks.For example, buffered events in TelemetryReporter is not sent.
      // So manually dispose them.
      ExtTelemetry.reporter?.dispose();
    }

    // wait 2 seconds before reloading.
    await sleep(2000);
    const success = await commands.executeCommand("workbench.action.reloadWindow");
    if (success) {
      return ok(success as boolean);
    } else {
      return err(internalUIError);
    }
  }

  async executeFunction(config: ExecuteFuncConfig) {
    const quickPick = window.createQuickPick<FxQuickPickItem>();
    quickPick.title = config.title;
    quickPick.busy = true;
    quickPick.enabled = false;
    quickPick.show();
    try {
      return await config.func(config.inputs);
    } finally {
      quickPick.hide();
      quickPick.dispose();
    }
  }

  async runCommand(args: {
    cmd: string;
    workingDirectory?: string | undefined;
    shell?: string | undefined;
    timeout?: number | undefined;
    env?: { [k: string]: string } | undefined;
  }): Promise<Result<string, FxError>> {
    const cmd = args.cmd;
    const workingDirectory = args.workingDirectory;
    const shell = args.shell;
    const timeout = args.timeout;
    const env = args.env;
    const timeoutPromise = new Promise((_resolve: (value: string) => void, reject) => {
      const wait = setTimeout(() => {
        clearTimeout(wait);
        reject(new SystemError("Terminal", "Timeout", "runCommand timed out."));
      }, timeout ?? 1000 * 60 * 5);
    });

    try {
      let terminal: Terminal | undefined;
      const name = shell ? `${TerminalName}-${shell}` : TerminalName;
      if (
        window.terminals.length === 0 ||
        (terminal = find(window.terminals, (value) => value.name === name)) === undefined
      ) {
        terminal = window.createTerminal({
          name,
          shellPath: shell,
          cwd: workingDirectory,
          env,
        });
      }
      terminal.show();
      terminal.sendText(cmd);

      const processId = await Promise.race([terminal.processId, timeoutPromise]);
      await sleep(500);
      await showOutputChannel();
      return ok(processId?.toString() ?? "");
    } catch (error) {
      return err(assembleError(error));
    }
  }

  public async openFile(filePath: string): Promise<Result<boolean, FxError>> {
    const uri = Uri.file(filePath);
    return new Promise(async (resolve) => {
      const doc = await workspace.openTextDocument(uri);
      if (doc) {
        if (filePath.endsWith(".md")) {
          await commands.executeCommand("markdown.showPreview", uri);
        } else {
          await window.showTextDocument(doc);
        }
        resolve(ok(true));
      } else {
        resolve(err(internalUIError));
      }
    });
  }
}
