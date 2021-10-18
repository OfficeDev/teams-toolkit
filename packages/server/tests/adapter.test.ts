// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FuncQuestion,
  Inputs,
  Json,
  MultiSelectQuestion,
  Platform,
  QTreeNode,
  StaticOptions,
  TextInputQuestion,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import sinon from "sinon";
import { callFunc, questionToJson, reset, Rpc } from "../src/questionAdapter";

describe("Core basic APIs", () => {
  const sandbox = sinon.createSandbox();
  const func1 = async (inputs: Inputs): Promise<any> => {
    return inputs.platform;
  };
  const func2 = async (input: string, inputs?: Inputs): Promise<string | undefined> => {
    if (input.length < 5) return "length < 5";
    return undefined;
  };
  beforeEach(() => {});

  afterEach(async () => {
    reset();
  });

  it("condition is function, question is func type", async () => {
    const question: FuncQuestion = {
      name: "test-question",
      type: "func",
      func: func1,
    };

    const node = new QTreeNode(question);
    node.condition = {
      validFunc: func2,
    };

    const json = questionToJson(node);

    const expected: Json = {
      data: {
        name: "test-question",
        type: "func",
        func: {
          type: "LocalFunc",
          id: 2,
        },
      },
      condition: {
        validFunc: {
          type: "ValidateFunc",
          id: 1,
        },
      },
    };

    assert.deepEqual(json, expected);

    {
      const real = await callFunc(json.data.func as Rpc, { platform: Platform.VSCode });
      const expected = await func1({ platform: Platform.VSCode });
      if (real.isOk()) {
        assert.equal(real.value, expected);
      }
    }
    {
      const real = await callFunc(json.condition.validFunc as Rpc, "12a123", {
        platform: Platform.VSCode,
      });
      const expected = await func2("12a123", { platform: Platform.VSCode });
      if (real.isOk()) {
        assert.equal(real.value, expected);
      }
    }

    {
      json.condition.validFunc.id = 100;
      const real = await callFunc(json.condition.validFunc as Rpc, "12a123", {
        platform: Platform.VSCode,
      });
      assert.isTrue(real.isErr() && real.error.name === "FuncNotFound");
    }
  });

  it("default, placeholder, prompt, validation is function", async () => {
    const question: TextInputQuestion = {
      name: "test-question",
      type: "text",
      title: "title",
      default: func1,
      placeholder: func1,
      prompt: func1,
      validation: { validFunc: func2 },
    };
    const node = new QTreeNode(question);
    const json = questionToJson(node);
    const expected: Json = {
      data: {
        name: "test-question",
        type: "text",
        title: "title",
        default: {
          type: "LocalFunc",
          id: 1,
        },
        placeholder: {
          type: "LocalFunc",
          id: 2,
        },
        prompt: {
          type: "LocalFunc",
          id: 3,
        },
        validation: {
          validFunc: {
            type: "ValidateFunc",
            id: 4,
          },
        },
      },
    };

    assert.deepEqual(json, expected);

    {
      const real = await callFunc(json.data.default as Rpc, { platform: Platform.VSCode });
      const expected = await func1({ platform: Platform.VSCode });
      if (real.isOk()) {
        assert.equal(real.value, expected);
      }
    }
    {
      const real = await callFunc(json.data.placeholder as Rpc, { platform: Platform.VSCode });
      const expected = await func1({ platform: Platform.VSCode });
      if (real.isOk()) {
        assert.equal(real.value, expected);
      }
    }
    {
      const real = await callFunc(json.data.prompt as Rpc, { platform: Platform.VSCode });
      const expected = await func1({ platform: Platform.VSCode });
      if (real.isOk()) {
        assert.equal(real.value, expected);
      }
    }
    {
      const real = await callFunc(json.data.validation.validFunc as Rpc, "12a123", {
        platform: Platform.VSCode,
      });
      const expected = await func2("12a123", { platform: Platform.VSCode });
      if (real.isOk()) {
        assert.equal(real.value, expected);
      }
    }
  });

  it("multi-selection: onSelectChangeFunc, dynamicOptions", async () => {
    const func1 = async (inputs: Inputs): Promise<StaticOptions> => {
      return ["111", "222"];
    };
    const func2 = async (
      currentSelectedIds: Set<string>,
      previousSelectedIds: Set<string>
    ): Promise<Set<string>> => {
      return currentSelectedIds;
    };

    const question: MultiSelectQuestion = {
      name: "test-question",
      type: "multiSelect",
      title: "title",
      staticOptions: [],
      dynamicOptions: func1,
      onDidChangeSelection: func2,
    };
    const node = new QTreeNode(question);
    const json = questionToJson(node);
    const expected: Json = {
      data: {
        name: "test-question",
        type: "multiSelect",
        title: "title",
        staticOptions: [],
        dynamicOptions: {
          type: "LocalFunc",
          id: 1,
        },
        onDidChangeSelection: {
          type: "OnSelectionChangeFunc",
          id: 2,
        },
      },
    };

    assert.deepEqual(json, expected);

    {
      const real = await callFunc(json.data.dynamicOptions as Rpc, { platform: Platform.VSCode });
      const expected = await func1({ platform: Platform.VSCode });
      if (real.isOk()) {
        assert.deepEqual(real.value, expected);
      }
    }
    {
      const real = await callFunc(
        json.data.onDidChangeSelection as Rpc,
        new Set<string>(["1", "2"]),
        new Set<string>(["3", "4"])
      );
      const expected = await func2(new Set<string>(["1", "2"]), new Set<string>(["3", "4"]));
      if (real.isOk()) {
        assert.deepEqual(real.value, expected);
      }
    }
  });
});
