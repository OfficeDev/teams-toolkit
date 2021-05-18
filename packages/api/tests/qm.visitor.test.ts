// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import {
  Func,
  FxError,
  FxInputBoxOption,
  FxOpenDialogOption,
  FxQuickPickOption,
  InputResult,
  InputResultType,
  NodeType,
  ok,
  OptionItem,
  Platform,
  QTreeNode,
  Inputs,
  Result,
  SingleSelectQuestion,
  traverse,
  UserInterface,
  ConfigMap,
} from "../src/index";
import * as chai from "chai";
import { RemoteFuncExecutor } from "../src/qm/validation";

const mockRemoteFuncExecutor: RemoteFuncExecutor = async function (
  func: Func,
  answers: ConfigMap
): Promise<Result<string | undefined, FxError>> {
  if (func.method === "mockValidator") {
    const input = func.params as string;
    if (input.length > 5) return ok("input too long");
    else return ok(undefined);
  }
  return ok(undefined);
};

function createSingleSelectioNode(
  id: string,
  optionLength: number,
  stringOption: boolean
): QTreeNode {
  const question: SingleSelectQuestion = {
    type: NodeType.singleSelect,
    name: id,
    title: id,
    option: [],
  };
  for (let i = 0; i < optionLength; ++i) {
    const optionId = `${id}-${i + 1}`;
    if (stringOption) (question.option as string[]).push(optionId);
    else (question.option as OptionItem[]).push({ id: optionId, label: optionId });
  }
  return new QTreeNode(question);
}

describe("Question Model - Traverse Test", () => {
  it("Select branch", async () => {
    const titleTrace: (string | undefined)[] = [];
    const selectTrace: (string | undefined)[] = [];
    const mockUi: UserInterface = {
      showQuickPick: async function (option: FxQuickPickOption): Promise<InputResult> {
        titleTrace.push(option.title);
        const index: number = Math.floor(Math.random() * option.items.length);
        const result = option.items[index];
        const optionIsString = typeof result === "string";
        const returnId = optionIsString ? (result as string) : (result as OptionItem).id;
        selectTrace.push(returnId);
        if (option.returnObject) {
          return { type: InputResultType.sucess, result: optionIsString ? { id: result } : result };
        } else {
          return { type: InputResultType.sucess, result: returnId };
        }
      },
      showInputBox: async function (option: FxInputBoxOption): Promise<InputResult> {
        titleTrace.push(option.title);
        return { type: InputResultType.sucess, result: "ok" };
      },
      showOpenDialog: async function (option: FxOpenDialogOption): Promise<InputResult> {
        titleTrace.push(option.title);
        return { type: InputResultType.sucess, result: "ok" };
      },
    };

    const n1 = createSingleSelectioNode("1", 2, false);

    const n11 = createSingleSelectioNode("1-1", 2, false);
    n11.condition = { equals: "1-1" };
    n1.addChild(n11);

    const n12 = createSingleSelectioNode("1-2", 2, false);
    n12.condition = { equals: "1-2" };
    n1.addChild(n12);

    const n111 = createSingleSelectioNode("1-1-1", 2, false);
    n111.condition = { equals: "1-1-1" };
    n11.addChild(n111);

    const n112 = createSingleSelectioNode("1-1-2", 2, false);
    n112.condition = { equals: "1-1-2" };
    n11.addChild(n112);

    const n121 = createSingleSelectioNode("1-2-1", 2, false);
    n121.condition = { equals: "1-2-1" };
    n12.addChild(n121);

    const n122 = createSingleSelectioNode("1-2-2", 2, false);
    n122.condition = { equals: "1-2-2" };
    n12.addChild(n122);

    const inputs = new ConfigMap();
    const res = await traverse(n1, inputs, mockUi);
    chai.assert.isTrue(res.type === InputResultType.sucess);
    chai.assert.isTrue(titleTrace.length === 3);
    chai.assert.isTrue(selectTrace.length === 3);
    for (let i = 0; i < selectTrace.length - 1; ++i) {
      chai.assert.isTrue(!!(titleTrace[i + 1] === selectTrace[i]));
    }
  });
});
