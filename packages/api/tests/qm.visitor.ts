import { Platform } from "../src";
import { FxInputBoxOption, FxOpenDialogOption, FxQuickPickOption, InputResult, InputResultType, NodeType, OptionItem, QTreeNode, SingleSelectQuestion, traverse, UserInputs, UserInterface } from "../src/qm";

function createSingleSelectioNode(id:string, optionLength:number, stringOption:boolean):QTreeNode{
    const question:SingleSelectQuestion = {
      type: NodeType.singleSelect,
      name: id,
      title: id,
      option: []
    };
    for(let i = 0; i < optionLength; ++ i){
      const optionId = `${id}-${i+1}`;
      if(stringOption) (question.option as string[]).push(optionId);
      else  (question.option as OptionItem[]).push( {id:optionId, label: optionId});
    }
    return new QTreeNode(question);
  }
  
async function test(){
    const titleTrace:(string|undefined)[] = [];
    const selectTrace:(string|undefined)[] = [];

    const mockUi:UserInterface = {
    showQuickPick: async function(option: FxQuickPickOption):Promise<InputResult> {
        titleTrace.push(option.title);
        const index:number = Math.floor(Math.random() * option.items.length);	
        const result = option.items[index];
        const optionIsString = typeof result === "string";
        const returnId = optionIsString ? result as string : (result as OptionItem).id;
        selectTrace.push(returnId);
        if(option.returnObject){
        return {type: InputResultType.sucess, result: optionIsString ? {id:result} : result};
        }
        else {
        return {type: InputResultType.sucess, result: returnId};
        }
    },
    showInputBox: async function(option: FxInputBoxOption):Promise<InputResult> {
        titleTrace.push(option.title);
        return { type: InputResultType.sucess, result: "ok"};
    },
    showOpenDialog: async function(option: FxOpenDialogOption):Promise<InputResult> {
        titleTrace.push(option.title);
        return { type: InputResultType.sucess, result: "ok"};
    }
    };

    const n1 = createSingleSelectioNode("1", 2, false);

    const n11 = createSingleSelectioNode("1-1", 2, false);
    n11.condition = {equals:"1-1"};
    n1.addChild(n11);

    const n12 = createSingleSelectioNode("1-2", 2, false);
    n12.condition = {equals:"1-2"};
    n1.addChild(n12);

    const n111 = createSingleSelectioNode("1-1-1", 2, false);
    n111.condition = {equals:"1-1-1"};
    n11.addChild(n111);

    const n112 = createSingleSelectioNode("1-1-2", 2, false);
    n112.condition = {equals:"1-1-2"};
    n11.addChild(n112);

    const n121 = createSingleSelectioNode("1-2-1", 2, false);
    n121.condition = {equals:"1-2-1"};
    n12.addChild(n121);

    const n122 = createSingleSelectioNode("1-2-2", 2, false);
    n122.condition = {equals:"1-2-2"};
    n12.addChild(n122);

    const inputs:UserInputs = {platform:Platform.VSCode};
    const res = await traverse(n1, inputs, mockUi);

    console.log(titleTrace);
    console.log(selectTrace);

    for(let i = 0; i < selectTrace.length - 1; ++ i){
        console.log(titleTrace[i+1]);
        console.log(selectTrace[i]);
        console.log("---");
    }
}


test();