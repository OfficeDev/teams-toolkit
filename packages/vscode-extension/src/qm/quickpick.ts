import {
  OptionItem,
  returnSystemError,
  MultiSelectResult,
  MultiSelectConfig
} from "@microsoft/teamsfx-api";
import { Disposable, QuickInputButton, QuickInputButtons, Uri, window } from "vscode";
import { ExtensionErrors, ExtensionSource } from "../error";
import { ext } from "../extensionVariables";
import { cloneSet, FxQuickPickItem } from "./vsc_ui";

export class FxMultiQuickPickItem implements FxQuickPickItem {
  id: string;
  data?: unknown;
  label: string;
  description?: string | undefined;
  detail?: string | undefined;
  alwaysShow?: boolean | undefined;
  picked: boolean;
  rawLabel: string;

  constructor(option: string | OptionItem) {
    if (typeof option === "string") {
      this.id = option;
      this.label = option;
      this.rawLabel = option;
      this.picked = false;
    } else {
      const item = option as OptionItem;
      this.id = item.id;
      this.label = item.label;
      this.description = item.description;
      this.detail = item.detail;
      this.rawLabel = item.label;
      this.data = item.data;
      this.picked = false;
    }
  }

  getOptionItem(): OptionItem {
    return {
      id: this.id,
      label: this.rawLabel,
      description: this.description,
      detail: this.detail,
      data: this.data,
    };
  }

  click() {
    this.picked = !this.picked;
    this.label = (this.picked === true ? "$(check) " : " ") + this.rawLabel;
  }

  check() {
    this.picked = true;
    this.label = "$(check) " + this.rawLabel;
  }

  uncheck() {
    this.picked = false;
    this.label = " " + this.rawLabel;
  }
}

export async function selectOptions(config: MultiSelectConfig): Promise<MultiSelectResult> {
  const okButton: QuickInputButton = {
    iconPath: Uri.file(ext.context.asAbsolutePath("media/ok.svg")),
    tooltip: "ok",
  };
  const disposables: Disposable[] = [];
  try {
    const quickPick = window.createQuickPick<FxMultiQuickPickItem>();
    disposables.push(quickPick);
    quickPick.title = config.title;
    if (config.step && config.step > 1) quickPick.buttons = [QuickInputButtons.Back, okButton];
    else quickPick.buttons = [okButton];
    quickPick.placeholder = config.placeholder;
    quickPick.ignoreFocusOut = true;
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;
    quickPick.canSelectMany = false;
    quickPick.step = config.step;
    quickPick.totalSteps = config.totalSteps;
    const currentIds = new Set<string>();
    const preIds = new Set<string>();

    let selectNum = config.default ? config.default.length : 0;
    const firstItem = new FxMultiQuickPickItem({
      description: "",
      detail: `${
        config.prompt ? config.prompt + ", p" : "P"
      }ress <Enter> to continue, press <Alt+LeftArrow> to go back. `,
      id: "",
      label: `$(checklist) Selected ${selectNum} item${selectNum > 1 ? "s" : ""}`,
    });

    return new Promise<MultiSelectResult>(async (resolve): Promise<void> => {
      const onDidAccept = async () => {
        const item = quickPick.selectedItems[0];
        if (item === undefined || item === firstItem) {
          const selectedItems = quickPick.items.filter((i) => i.picked);
          const strArray = Array.from(selectedItems.map((i) => i.id));
          if (config.validation) {
            const validateRes = await config.validation(strArray);
            if (validateRes) {
              return;
            }
          }
          if (config.returnObject)
            resolve({
              type: "success",
              result: selectedItems.map((i) => i.getOptionItem()),
            });
          else resolve({ type: "success", result: selectedItems.map((i) => i.id) });
        }
        item.click();
        if (config.onDidChangeSelection) {
          currentIds.clear();
          quickPick.items.filter((i) => i.picked).map((i) => currentIds.add(i.id));
          const clonedCurrentSet = cloneSet(currentIds);
          const newIds = await config.onDidChangeSelection( clonedCurrentSet, preIds );
          preIds.clear();
          quickPick.items.forEach((i) => {
            if (newIds.has(i.id)) {
              i.check();
              preIds.add(i.id);
            } else i.uncheck();
          });
        }
        selectNum = quickPick.items.filter((i) => i.picked).length;
        firstItem.label = `$(checklist) Selected ${selectNum} item${selectNum > 1 ? "s" : ""}`;
        quickPick.items = quickPick.items;
      };

      disposables.push(
        quickPick.onDidAccept(onDidAccept),
        quickPick.onDidHide(() => {
          resolve({ type: "cancel" });
        })
      );
      disposables.push(
        quickPick.onDidTriggerButton((button) => {
          if (button === QuickInputButtons.Back) resolve({ type: "back" });
          else onDidAccept();
        })
      );
      try {
        // set items
        const items: FxMultiQuickPickItem[] = [firstItem];
        config.options.forEach((element: string | OptionItem) => {
          items.push(new FxMultiQuickPickItem(element));
        });
        // default
        if (config.default) {
          const ids = config.default as string[];
          items.forEach((i) => {
            if (ids.includes(i.id)) {
              i.check();
            }
          });
          preIds.clear();
          items.filter((i) => i.picked).map(i=>preIds.add(i.id));
        }
        quickPick.items = items;
        disposables.push(quickPick);
        quickPick.show();
      } catch (err) {
        resolve({
          type: "error",
          error: returnSystemError(err, ExtensionSource, ExtensionErrors.UnknwonError),
        });
      }
    });
  } finally {
    disposables.forEach((d) => {
      d.dispose();
    });
  }
}
