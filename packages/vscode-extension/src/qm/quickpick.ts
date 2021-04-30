import { FxQuickPickOption, InputResult, InputResultType, OptionItem, returnSystemError, StaticOption } from "fx-api";
import { Disposable, QuickInputButton, QuickInputButtons, Uri, window } from "vscode";
import { ExtensionErrors, ExtensionSource } from "../error";
import { ext } from "../extensionVariables";
import { FxQuickPickItem } from "./vsc_ui";

export class FxMultiQuickPickItem implements FxQuickPickItem {

    id: string;
    data?: unknown;
    label: string;
    description?: string | undefined;
    detail?: string | undefined;
    alwaysShow?: boolean | undefined;
 
    picked: boolean;
    rawLabel: string;

    constructor(option: string | OptionItem){
        if(typeof option === "string"){
            this.id = option;
            this.label = option;
            this.rawLabel = option;
            this.picked = false;
            
        }
        else {
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

    getOptionItem():OptionItem{
        return {
            id: this.id,
            label: this.rawLabel,
            description: this.description,
            detail: this.detail,
            data: this.data
        }
    }

    click(){
        this.picked = !this.picked;
        this.label = (this.picked === true ? "$(check " : " ") + this.rawLabel; 
    }

    check(){
        this.picked = true;
        this.label = "$(check) " + this.rawLabel; 
    }

    uncheck(){
        this.picked = false;
        this.label = " " + this.rawLabel; 
    }
}

export async function multiQuickPick(option: FxQuickPickOption) : Promise<InputResult>{
    const okButton : QuickInputButton = { 
        iconPath: Uri.file(ext.context.asAbsolutePath("media/ok.svg")),
        tooltip:"ok"
    };  
    const disposables: Disposable[] = [];
    try {
        const quickPick = window.createQuickPick<FxMultiQuickPickItem>();
        disposables.push(quickPick);
        quickPick.title = option.title;
        if (option.backButton) quickPick.buttons = [QuickInputButtons.Back, okButton];
        else quickPick.buttons = [okButton];
        quickPick.placeholder = option.placeholder;
        quickPick.ignoreFocusOut = false;
        quickPick.matchOnDescription = true;
        quickPick.matchOnDetail = true;
        quickPick.canSelectMany = false;
        // quickPick.step = option.step;
        // quickPick.totalSteps = option.totalSteps;
        let previousSelectedItems:OptionItem[] = [];

        let selectNum = option.defaultValue? (option.defaultValue).length : 0;
        const firstItem =  new FxMultiQuickPickItem({
            description: "",
            detail: "Press <Enter> to continue.",
            id: "",
            label: `$(checklist) Selected ${selectNum} item${selectNum > 1 ? 's':''}`,
        });

        return await new Promise<InputResult>(
        async (resolve): Promise<void> => {
            const onDidAccept = async () => {
                const item = quickPick.selectedItems[0];
                if(item === undefined || item === firstItem){
                    const selectedItems = quickPick.items.filter(i=>i.picked);
                    if(option.returnObject) resolve({ type: InputResultType.sucess, result: selectedItems.map(i=>i.getOptionItem())});
                    else resolve({ type: InputResultType.sucess, result: selectedItems.map(i=>i.id)});
                }
                item.click();
                if(option.onDidChangeSelection){
                    const newIds:string[] = (await option.onDidChangeSelection(quickPick.items.filter(i=>i.picked).map(i=>i.getOptionItem()), previousSelectedItems)).sort();
                    previousSelectedItems = [];
                    quickPick.items.forEach(i=>{
                        if(newIds.includes(i.id)){
                            i.check();
                            previousSelectedItems.push(i.getOptionItem());
                        }
                        else i.uncheck();
                    });
                }
                selectNum = quickPick.items.filter(i=>i.picked).length;
                firstItem.label = `$(checklist) Selected ${selectNum} item${selectNum > 1 ? 's':''}`;
                quickPick.items = quickPick.items;
            };

            disposables.push(
            quickPick.onDidAccept(onDidAccept),
            quickPick.onDidHide(() => {
                resolve({ type: InputResultType.cancel});
            })
            );
            disposables.push(
            quickPick.onDidTriggerButton((button) => { 
                if (button === QuickInputButtons.Back)
                resolve({ type: InputResultType.back });
                else
                onDidAccept();
            })
            );
            try {
                // set items
                const items:FxMultiQuickPickItem[] = [firstItem]; 
                option.items.forEach((element: string | OptionItem) => {
                    items.push(new FxMultiQuickPickItem(element))
                });
                // default
                if (option.defaultValue) {
                    const ids = option.defaultValue as string[];
                    items.forEach(i=>{
                        if(ids.includes(i.id)){
                            i.check();
                        }
                    });
                    previousSelectedItems = items.filter(i=>i.picked).map(i=>i.getOptionItem());
                }
                quickPick.items = items; 
                disposables.push(quickPick);
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
