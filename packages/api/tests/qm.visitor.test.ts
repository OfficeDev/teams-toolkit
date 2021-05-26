// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import {
  OptionItem,
  QTreeNode,
  SingleSelectQuestion,
  traverse,
  UserInteraction,
  InputTextConfig,
  SelectFolderConfig,
  SelectFileConfig,
  SelectFilesConfig,
  TimeConsumingTask,
  SingleSelectConfig,
  MultiSelectConfig,
  SingleSelectResult,
  MultiSelectResult,
  returnSystemError,
  InputTextResult,
  SelectFolderResult,
  SelectFileResult,
  SelectFilesResult,
  OpenUrlResult,
  ShowMessageResult,
  Inputs,
  Platform,
  VsCodeEnv
} from "../src/index";
import * as chai from "chai"; 
  

function createSingleSelectioNode(id: string, optionLength: number, stringOption: boolean): QTreeNode {
  const question: SingleSelectQuestion = {
    type: "singleSelect",
    name: id,
    title: id,
    staticOptions: []
  };
  for (let i = 0; i < optionLength; ++i) {
    const optionId = `${id}-${i + 1}`;
    if (stringOption) (question.staticOptions as string[]).push(optionId);
    else (question.staticOptions as OptionItem[]).push({id: optionId, label: optionId});
  }
  return new QTreeNode(question);
}

describe("Question Model - Traverse Test", () => {
  it("Select branch", async () => {

    const titleTrace: (string | undefined)[] = [];
    const selectTrace: (string | undefined)[] = [];
    const mockUi: UserInteraction = {
      selectOption: async function (config: SingleSelectConfig): Promise<SingleSelectResult> {
        titleTrace.push(config.title);
        const index: number = Math.floor(Math.random() * config.options.length);
        const result = config.options[index];
        const optionIsString = typeof result === "string";
        const returnId = optionIsString ? result as string : (result as OptionItem).id;
        selectTrace.push(returnId);
        if (config.returnObject) {
          return {type: "success", result: result};
        }
        else {
          return {type: "success", result: returnId};
        }
      },
      selectOptions: async function (config: MultiSelectConfig) : Promise<MultiSelectResult>{
        return {
          type: "error",
          error: returnSystemError(
            new Error("Not support"),
            "ExtensionTest",
            "NotSupport"
          )
        }
      },
      inputText: async function (config: InputTextConfig): Promise<InputTextResult> {
        titleTrace.push(config.title);
        return {type: "success", result: "ok"};
      },
      selectFolder: async function (config: SelectFolderConfig): Promise<SelectFolderResult> {
        titleTrace.push(config.title);
        return {type: "success", result: "ok"};
      },
      selectFile: async function(config: SelectFileConfig) : Promise<SelectFileResult>{
        return {type: "success", result: "ok"};
      },
      selectFiles: async function(config: SelectFilesConfig) : Promise<SelectFilesResult>{
        throw Error("Not support");
      },
      openUrl: async function(link: string): Promise<OpenUrlResult>{
        throw Error("Not support");
      },
      showMessage: async function(
        level: "info" | "warn" | "error",
        message: string,
        modal: boolean,
        ...items: string[]
      ): Promise<ShowMessageResult>{
        throw Error("Not support");
      },
      runWithProgress: async function(task: TimeConsumingTask<any>): Promise<any>{
        throw Error("Not support");
      }
    };

    const n1 = createSingleSelectioNode("1", 2, false);

    const n11 = createSingleSelectioNode("1-1", 2, false);
    n11.condition = {equals: "1-1"};
    n1.addChild(n11);

    const n12 = createSingleSelectioNode("1-2", 2, false);
    n12.condition = {equals: "1-2"};
    n1.addChild(n12);

    const n111 = createSingleSelectioNode("1-1-1", 2, false);
    n111.condition = {equals: "1-1-1"};
    n11.addChild(n111);

    const n112 = createSingleSelectioNode("1-1-2", 2, false);
    n112.condition = {equals: "1-1-2"};
    n11.addChild(n112);

    const n121 = createSingleSelectioNode("1-2-1", 2, false);
    n121.condition = {equals: "1-2-1"};
    n12.addChild(n121);

    const n122 = createSingleSelectioNode("1-2-2", 2, false);
    n122.condition = {equals: "1-2-2"};
    n12.addChild(n122);

    const inputs:Inputs = {platform:Platform.VSCode, vscodeEnv: VsCodeEnv.local};
    const res = await traverse(n1, inputs, mockUi);
    chai.assert.isTrue(res.type === "success");
    chai.assert.isTrue(titleTrace.length === 3);
    chai.assert.isTrue(selectTrace.length === 3);
    for (let i = 0; i < selectTrace.length - 1; ++i) {
      chai.assert.isTrue(!!(titleTrace[i + 1] === selectTrace[i]));
    }
  });
});
 
