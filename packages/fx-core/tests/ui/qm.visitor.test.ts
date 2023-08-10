// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import "mocha";
import sinon from "sinon";
import {
  Colors,
  FxError,
  IProgressHandler,
  InputResult,
  InputTextConfig,
  InputTextResult,
  Inputs,
  MultiSelectConfig,
  MultiSelectQuestion,
  MultiSelectResult,
  OptionItem,
  Platform,
  QTreeNode,
  Result,
  SelectFileConfig,
  SingleFileOrInputQuestion,
  SelectFileResult,
  SelectFilesConfig,
  SelectFilesResult,
  SelectFolderConfig,
  SelectFolderResult,
  SingleSelectConfig,
  SingleSelectQuestion,
  SingleSelectResult,
  StaticOptions,
  StringValidation,
  TextInputQuestion,
  UserInteraction,
  err,
  ok,
  SingleFileOrInputConfig,
  IQTreeNode,
} from "@microsoft/teamsfx-api";
import {
  EmptyOptionError,
  MissingRequiredInputError,
  UserCancelError,
} from "../../src/error/common";
import { loadOptions, questionVisitor, traverse } from "../../src/ui/visitor";
import mockedEnv, { RestoreFn } from "mocked-env";

function createInputs(): Inputs {
  return {
    platform: Platform.VSCode,
  };
}

function createTextQuestion(name: string): TextInputQuestion {
  return {
    type: "text",
    name: name,
    title: name,
  };
}

function createSingleSelectQuestion(name: string, options?: string[]): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: name,
    title: name,
    staticOptions: options || [],
  };
}

function createMultiSelectQuestion(name: string): MultiSelectQuestion {
  return {
    type: "multiSelect",
    name: name,
    title: name,
    staticOptions: [],
  };
}

class MockUserInteraction implements UserInteraction {
  selectOption(config: SingleSelectConfig): Promise<Result<SingleSelectResult, FxError>> {
    throw new Error("Method not implemented.");
  }
  selectOptions(config: MultiSelectConfig): Promise<Result<MultiSelectResult, FxError>> {
    throw new Error("Method not implemented.");
  }
  inputText(config: InputTextConfig): Promise<Result<InputTextResult, FxError>> {
    throw new Error("Method not implemented.");
  }
  selectFile(config: SelectFileConfig): Promise<Result<SelectFileResult, FxError>> {
    throw new Error("Method not implemented.");
  }
  selectFiles(config: SelectFilesConfig): Promise<Result<SelectFilesResult, FxError>> {
    throw new Error("Method not implemented.");
  }
  selectFolder(config: SelectFolderConfig): Promise<Result<SelectFolderResult, FxError>> {
    throw new Error("Method not implemented.");
  }

  openUrl(link: string): Promise<Result<boolean, FxError>> {
    throw new Error("Method not implemented.");
  }
  async showMessage(
    level: "info" | "warn" | "error",
    message: string,
    modal: boolean,
    ...items: string[]
  ): Promise<Result<string | undefined, FxError>>;

  async showMessage(
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
    throw new Error("Method not implemented.");
  }
  createProgressBar(title: string, totalSteps: number): IProgressHandler {
    throw new Error("Method not implemented.");
  }

  selectFileOrInput(
    config: SingleFileOrInputConfig
  ): Promise<Result<InputResult<string>, FxError>> {
    throw new Error("Method not implemented.");
  }
}

const mockUI = new MockUserInteraction();

describe("Question Model - Visitor Test", () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  describe("question", () => {
    it("trim() case 1", async () => {
      const node1 = new QTreeNode({ type: "group" });
      const node2 = new QTreeNode({ type: "group" });
      const node3 = new QTreeNode({ type: "group" });
      node1.addChild(node2);
      node1.addChild(node3);
      const trimed = node1.trim();
      assert.isTrue(trimed === undefined);
    });

    it("trim() case 2", async () => {
      const node1 = new QTreeNode({ type: "group" });
      const node2 = new QTreeNode({ type: "group" });
      const node3 = new QTreeNode({ type: "text", name: "t1", title: "t1" });
      node3.condition = { equals: "1" };
      node1.addChild(node2);
      node2.addChild(node3);
      const trimed = node1.trim();
      assert.isTrue(trimed && trimed.data.name === "t1" && trimed.validate());
    });

    it("trim() case 3 - parent node has condition, and child node has no condition.", async () => {
      const condition: StringValidation = {
        equals: "test",
      };

      // Arrange
      // input
      const node1 = new QTreeNode({ type: "group" });
      node1.condition = condition;
      const node2 = new QTreeNode({ type: "text", name: "t1", title: "t1" });
      node1.addChild(node2);

      // expected
      const expected1 = new QTreeNode({ type: "text", name: "t1", title: "t1" });
      expected1.condition = condition;

      // Act
      const trimmed = node1.trim();

      // Assert
      assert.deepEqual(trimmed, expected1);
    });
    it("trim() case 4 - parent node has no condition, and child node has condition.", async () => {
      const condition: StringValidation = {
        equals: "test",
      };

      // Arrange
      // input
      const node1 = new QTreeNode({ type: "group" });
      const node2 = new QTreeNode({ type: "text", name: "t1", title: "t1" });
      node2.condition = condition;
      node1.addChild(node2);

      // expected
      const expected1 = new QTreeNode({ type: "text", name: "t1", title: "t1" });
      expected1.condition = condition;

      // Act
      const trimmed = node1.trim();

      // Assert
      assert.deepEqual(trimmed, expected1);
    });
    it("trim() case 5 - parent node has condition, and child node has condition.", async () => {
      const condition: StringValidation = {
        equals: "test",
      };

      // Arrange
      // input
      const node1 = new QTreeNode({ type: "group" });
      node1.condition = condition;
      const node2 = new QTreeNode({ type: "text", name: "t1", title: "t1" });
      node2.condition = condition;
      node1.addChild(node2);

      // expected
      const expected1 = new QTreeNode({ type: "group" });
      expected1.condition = condition;
      const expected2 = new QTreeNode({ type: "text", name: "t1", title: "t1" });
      expected2.condition = condition;
      expected1.addChild(expected2);

      // Act
      const trimmed = node1.trim();

      // Assert
      assert.deepEqual(trimmed, expected1);
    });
  });
  describe("traverse()", () => {
    beforeEach(() => {});

    afterEach(() => {
      sandbox.restore();
    });

    it("fail: user cancel", async () => {
      const num = 10;
      const cancelNum = 5;
      const actualSequence: string[] = [];
      sandbox.stub(mockUI, "inputText").callsFake(async (config: InputTextConfig) => {
        const actualStep = Number(config.name);
        if (actualStep === cancelNum) {
          return err(new UserCancelError());
        }
        actualSequence.push(config.name);
        assert(config.step === actualStep);
        return ok({ type: "success", result: `mocked value of ${config.name}` });
      });
      const root = new QTreeNode({ type: "group" });

      const expectedSequence: string[] = [];
      for (let i = 1; i <= num; ++i) {
        root.addChild(new QTreeNode(createTextQuestion(`${i}`)));
        if (i < cancelNum) expectedSequence.push(`${i}`);
      }
      const inputs = createInputs();
      const res = await traverse(root, inputs, mockUI);
      assert.isTrue(res.isErr() && res.error instanceof UserCancelError);
      for (let i = 1; i < cancelNum; ++i) {
        assert.isUndefined(inputs[`${i}`]);
      }
      assert.sameOrderedMembers(expectedSequence, actualSequence);
    });

    it("success: flat sequence", async () => {
      const actualSequence: string[] = [];
      sandbox.stub(mockUI, "inputText").callsFake(async (config: InputTextConfig) => {
        actualSequence.push(config.name);
        const actualStep = Number(config.name);
        assert(config.step === actualStep);
        return ok({ type: "success", result: `mocked value of ${config.name}` });
      });
      const root = new QTreeNode({ type: "group" });
      const num = 10;
      const expectedSequence: string[] = [];
      for (let i = 1; i <= num; ++i) {
        root.addChild(new QTreeNode(createTextQuestion(`${i}`)));
        expectedSequence.push(`${i}`);
      }
      const inputs = createInputs();
      const res = await traverse(root, inputs, mockUI);
      assert.isTrue(res.isOk());
      for (let i = 1; i <= num; ++i) {
        assert.isTrue(inputs[`${i}`] === `mocked value of ${i}`);
      }
      assert.sameOrderedMembers(expectedSequence, actualSequence);
    });

    it("success: auto skip single option select", async () => {
      const actualSequence: string[] = [];
      sandbox.stub(mockUI, "selectOption").callsFake(async (config: SingleSelectConfig) => {
        actualSequence.push(config.name);
        return ok({ type: "success", result: `mocked value of ${config.name}` });
      });
      const root = new QTreeNode({ type: "group" });
      const num = 10;
      const expectedSequence: string[] = [];
      for (let i = 1; i <= num; ++i) {
        const name = `${i}`;
        const question = createSingleSelectQuestion(name);
        if (i % 2 === 0) question.staticOptions = [`mocked value of ${name}`];
        else {
          question.staticOptions = [`mocked value of ${name}`, `mocked value of ${name} - 2`];
          expectedSequence.push(name);
        }
        question.skipSingleOption = true;
        const current = new QTreeNode(question);
        root.addChild(current);
      }
      const inputs = createInputs();
      const res = await traverse(root, inputs, mockUI);
      assert.isTrue(res.isOk());
      for (let i = 1; i <= num; ++i) {
        assert.isTrue(inputs[`${i}`] === `mocked value of ${i}`);
      }
      assert.sameOrderedMembers(expectedSequence, actualSequence);
    });

    it("success: flat sequence with back operation", async () => {
      const actualSequence: string[] = [];
      let backed = false;
      const inputs = createInputs();
      sandbox
        .stub(mockUI, "selectOption")
        .callsFake(
          async (config: SingleSelectConfig): Promise<Result<SingleSelectResult, FxError>> => {
            actualSequence.push(config.name);
            if (config.name === "3" && !backed) {
              backed = true;
              return ok({ type: "back" });
            }
            return ok({ type: "success", result: `mocked value of ${config.name}` });
          }
        );
      const root: IQTreeNode = {
        data: { type: "group" },
        children: [
          {
            data: createSingleSelectQuestion("1", ["1", "2", "3"]),
          },
          {
            data: createSingleSelectQuestion("2", ["1", "2", "3"]),
          },
          {
            data: createSingleSelectQuestion("3", ["1", "2", "3"]),
          },
        ],
      };
      const expectedSequence: string[] = ["1", "2", "3", "2", "3"];
      const res = await traverse(root, inputs, mockUI);
      assert.isTrue(res.isOk());
      assert.sameOrderedMembers(expectedSequence, actualSequence);
    });

    it("fail: go back from start and cancel", async () => {
      const actualSequence: string[] = [];
      const inputs = createInputs();
      let count = 0;
      sandbox
        .stub(mockUI, "selectOption")
        .callsFake(
          async (config: SingleSelectConfig): Promise<Result<SingleSelectResult, FxError>> => {
            actualSequence.push(config.name);
            count++;
            if (count >= 3) {
              return ok({ type: "back" });
            }
            return ok({ type: "success", result: `mocked value of ${config.name}` });
          }
        );
      const expectedSequence: string[] = ["1", "2", "3", "2", "1"];
      const root: IQTreeNode = {
        data: { type: "group" },
        children: [
          {
            data: createSingleSelectQuestion("1", ["1", "2", "3"]),
          },
          {
            data: createSingleSelectQuestion("2", ["1", "2", "3"]),
          },
          {
            data: createSingleSelectQuestion("3", ["1", "2", "3"]),
          },
        ],
      };

      const res = await traverse(root, inputs, mockUI);
      assert.isTrue(res.isErr() && res.error instanceof UserCancelError);
      assert.sameOrderedMembers(expectedSequence, actualSequence);
    });

    it("success: SingleSelectQuestion, MultiSelectQuestion", async () => {
      const actualSequence: string[] = [];
      const inputs = createInputs();
      sandbox
        .stub(mockUI, "selectOption")
        .callsFake(
          async (config: SingleSelectConfig): Promise<Result<SingleSelectResult, FxError>> => {
            actualSequence.push(config.name);
            return ok({ type: "success", result: (config.options as StaticOptions)[0] });
          }
        );
      sandbox
        .stub(mockUI, "selectOptions")
        .callsFake(
          async (config: MultiSelectConfig): Promise<Result<MultiSelectResult, FxError>> => {
            actualSequence.push(config.name);
            return ok({
              type: "success",
              result: [(config.options as StaticOptions)[0] as OptionItem],
            });
          }
        );
      const root = new QTreeNode({ type: "group" });
      const expectedSequence: string[] = ["1", "4"];

      const question1 = createSingleSelectQuestion("1");
      question1.staticOptions = [{ id: `mocked value of 1`, label: `mocked value of 1` }];
      question1.returnObject = true;
      root.addChild(new QTreeNode(question1));

      const question2 = createSingleSelectQuestion("2");
      question2.staticOptions = [{ id: `mocked value of 2`, label: `mocked value of 2` }];
      question2.skipSingleOption = true;
      root.addChild(new QTreeNode(question2));

      const question3 = createMultiSelectQuestion("3");
      question3.staticOptions = [{ id: `mocked value of 3`, label: `mocked value of 3` }];
      question3.skipSingleOption = true;
      question3.returnObject = true;
      root.addChild(new QTreeNode(question3));

      const question4 = createMultiSelectQuestion("4");
      question4.staticOptions = [{ id: `mocked value of 4`, label: `mocked value of 4` }];
      root.addChild(new QTreeNode(question4));

      const res = await traverse(root, inputs, mockUI);
      assert.isTrue(res.isOk());
      assert.deepEqual(inputs["1"], { id: `mocked value of 1`, label: `mocked value of 1` });
      assert.isTrue(typeof inputs["2"] === "string" && inputs["2"] === `mocked value of 2`);
      assert.isTrue(inputs["3"] instanceof Array);
      assert.isTrue(inputs["4"] instanceof Array);
      assert.deepEqual((inputs["3"] as StaticOptions)[0], {
        id: `mocked value of 3`,
        label: `mocked value of 3`,
      });
      assert.deepEqual((inputs["4"] as StaticOptions)[0], {
        id: `mocked value of 4`,
        label: `mocked value of 4`,
      });
      assert.sameOrderedMembers(expectedSequence, actualSequence);
    });

    it("success: node condition", async () => {
      const actualSequence: string[] = [];
      const inputs = createInputs();
      sandbox
        .stub(mockUI, "selectOption")
        .callsFake(
          async (config: SingleSelectConfig): Promise<Result<SingleSelectResult, FxError>> => {
            actualSequence.push(config.name);
            return ok({
              type: "success",
              result: (config.options as StaticOptions)[0] as OptionItem,
            });
          }
        );
      sandbox
        .stub(mockUI, "selectOptions")
        .callsFake(
          async (config: MultiSelectConfig): Promise<Result<MultiSelectResult, FxError>> => {
            actualSequence.push(config.name);
            return ok({
              type: "success",
              result: [(config.options as StaticOptions)[0] as OptionItem],
            });
          }
        );

      const expectedSequence: string[] = ["1"];

      const question1 = createSingleSelectQuestion("1");
      question1.staticOptions = ["2", "3"];
      question1.returnObject = true;
      const node1 = new QTreeNode(question1);

      const question2 = createSingleSelectQuestion("2");
      question2.staticOptions = [{ id: `mocked value of 2`, label: `mocked value of 2` }];
      question2.skipSingleOption = true;
      const node2 = new QTreeNode(question2);
      node2.condition = { equals: "2" };
      node1.addChild(node2);

      const question3 = createMultiSelectQuestion("3");
      question3.staticOptions = [{ id: `mocked value of 3`, label: `mocked value of 3` }];
      question3.skipSingleOption = true;
      const node3 = new QTreeNode(question3);
      node3.condition = { equals: "3" };
      node1.addChild(node3);

      const res = await traverse(node1, inputs, mockUI);
      assert.isTrue(res.isOk());
      assert.isTrue(inputs["1"] === `2`);
      assert.isTrue(typeof inputs["2"] === "string" && inputs["2"] === `mocked value of 2`);
      assert.sameOrderedMembers(expectedSequence, actualSequence);
    });

    it("success: node condition on OptionItem", async () => {
      const actualSequence: string[] = [];
      const inputs = createInputs();
      sandbox
        .stub(mockUI, "selectOption")
        .callsFake(
          async (config: SingleSelectConfig): Promise<Result<SingleSelectResult, FxError>> => {
            actualSequence.push(config.name);
            return ok({
              type: "success",
              result: (config.options as StaticOptions)[0] as OptionItem,
            });
          }
        );
      sandbox
        .stub(mockUI, "selectOptions")
        .callsFake(
          async (config: MultiSelectConfig): Promise<Result<MultiSelectResult, FxError>> => {
            actualSequence.push(config.name);
            return ok({
              type: "success",
              result: [(config.options as StaticOptions)[0] as OptionItem],
            });
          }
        );

      const expectedSequence: string[] = ["1"];

      const question1 = createSingleSelectQuestion("1");
      question1.staticOptions = [
        { id: "2", label: "2" },
        { id: "3", label: "3" },
      ];
      question1.returnObject = true;
      const node1 = new QTreeNode(question1);

      const question2 = createSingleSelectQuestion("2");
      question2.staticOptions = [{ id: `mocked value of 2`, label: `mocked value of 2` }];
      question2.skipSingleOption = true;
      const node2 = new QTreeNode(question2);
      node2.condition = { equals: "2" };
      node1.addChild(node2);

      const question3 = createMultiSelectQuestion("3");
      question3.staticOptions = [{ id: `mocked value of 3`, label: `mocked value of 3` }];
      question3.skipSingleOption = true;
      const node3 = new QTreeNode(question3);
      node3.condition = { equals: "3" };
      node1.addChild(node3);

      const res = await traverse(node1, inputs, mockUI);
      assert.isTrue(res.isOk());
      assert.isTrue(inputs["1"].id === "2");
      assert.isTrue(typeof inputs["2"] === "string" && inputs["2"] === `mocked value of 2`);
      assert.sameOrderedMembers(expectedSequence, actualSequence);
    });

    it("pre-defined question will not be count as one step", async () => {
      const actualSequence: string[] = [];
      const inputs = createInputs();
      sandbox
        .stub(mockUI, "selectOption")
        .callsFake(
          async (config: SingleSelectConfig): Promise<Result<SingleSelectResult, FxError>> => {
            actualSequence.push(config.name);
            return ok({ type: "success", result: (config.options as StaticOptions)[0] });
          }
        );
      const multiSelect = sandbox
        .stub(mockUI, "selectOptions")
        .callsFake(
          async (config: MultiSelectConfig): Promise<Result<MultiSelectResult, FxError>> => {
            actualSequence.push(config.name);
            return ok({
              type: "success",
              result: [(config.options as StaticOptions)[0] as OptionItem],
            });
          }
        );

      const root = new QTreeNode({ type: "group" });

      const question1 = createSingleSelectQuestion("1");
      question1.staticOptions = [
        { id: `mocked value of 1`, label: `mocked value of 1` },
        { id: `mocked value of 2`, label: `mocked value of 2` },
      ];
      question1.returnObject = true;
      root.addChild(new QTreeNode(question1));
      inputs["1"] = { id: `mocked value of 1`, label: `mocked value of 1` };

      const question3 = createMultiSelectQuestion("3");
      question3.staticOptions = [
        { id: `mocked value of 3`, label: `mocked value of 3` },
        { id: `mocked value of 4`, label: `mocked value of 4` },
      ];
      question3.skipSingleOption = true;
      question3.returnObject = true;
      root.addChild(new QTreeNode(question3));

      const res = await traverse(root, inputs, mockUI);
      assert.isTrue(res.isOk());
      assert.equal((multiSelect.lastCall.args[0] as MultiSelectConfig).step, 1);
    });

    it("success: complex go back", async () => {
      const actualSequence: string[] = [];
      const inputs = createInputs();
      let skiped = false;
      sandbox.stub(mockUI, "inputText").callsFake(async (config: InputTextConfig) => {
        actualSequence.push(config.name);
        if (config.name === "3" && !skiped) {
          skiped = true;
          return ok({ type: "back" });
        }
        return ok({ type: "success", result: `mocked value of ${config.name}` });
      });

      const expectedSequence: string[] = ["1", "2", "3", "2", "3", "4"];

      const question1 = createTextQuestion("1");
      const node1 = new QTreeNode(question1);

      const question2 = createTextQuestion("2");
      const node2 = new QTreeNode(question2);
      node1.addChild(node2);

      const question3 = createTextQuestion("3");
      const node3 = new QTreeNode(question3);
      node2.addChild(node3);

      const question4 = createTextQuestion("4");
      const node4 = new QTreeNode(question4);
      node2.addChild(node4);

      const res = await traverse(node1, inputs, mockUI);
      assert.isTrue(res.isOk());
      for (let i = 1; i <= 4; ++i) {
        assert.isTrue(inputs[`${i}`] === `mocked value of ${i}`);
      }
      assert.sameOrderedMembers(expectedSequence, actualSequence);
    });

    it("single selection", async () => {
      sandbox.stub(mockUI, "selectOption").resolves(ok({ type: "success", result: "1" }));
      const question: SingleSelectQuestion = {
        type: "singleSelect",
        name: "test",
        title: "test",
        staticOptions: [],
        dynamicOptions: () => Promise.resolve([{ id: "1", label: "1" }]),
      };
      const inputs = createInputs();
      const res = await traverse(new QTreeNode(question), inputs, mockUI);
      assert.isTrue(res.isOk());
      assert.isTrue(inputs["test"] === "1");
    });

    it("single selection empty options", async () => {
      sandbox.stub(mockUI, "selectOption").resolves(ok({ type: "success", result: "1" }));
      const question: SingleSelectQuestion = {
        type: "singleSelect",
        name: "test",
        title: "test",
        staticOptions: [],
      };
      const inputs = createInputs();
      const res = await traverse(new QTreeNode(question), inputs, mockUI);
      assert.isTrue(res.isErr());
      if (res.isErr()) {
        assert.isTrue(res.error instanceof EmptyOptionError);
      }
    });

    it("single file or input", async () => {
      sandbox.stub(mockUI, "selectFileOrInput").resolves(ok({ type: "success", result: "file" }));
      const question: SingleFileOrInputQuestion = {
        type: "singleFileOrText",
        name: "test",
        title: "test",
        inputOptionItem: {
          id: "input",
          label: "input",
        },
        inputBoxConfig: {
          type: "text",
          name: "input",
          title: "input",
        },
      };
      const inputs = createInputs();
      const res = await traverse(new QTreeNode(question), inputs, mockUI);
      assert.isTrue(res.isOk());
      assert.isTrue(inputs["test"] === "file");
    });

    it("single file or input with validation and additional validation", async () => {
      sandbox.stub(mockUI, "selectFileOrInput").resolves(ok({ type: "success", result: "file" }));
      const validation: StringValidation = {
        equals: "test",
      };
      const question: SingleFileOrInputQuestion = {
        type: "singleFileOrText",
        name: "test",
        title: "test",
        inputOptionItem: {
          id: "input",
          label: "input",
        },
        inputBoxConfig: {
          name: "input",
          type: "text",
          title: "input",
          additionalValidationOnAccept: {
            validFunc: async (input) => {
              return undefined;
            },
          },
        },
        validation: validation,
      };
      const inputs = createInputs();
      const res = await traverse(new QTreeNode(question), inputs, mockUI);
      assert.isTrue(res.isOk());
      assert.isTrue(inputs["test"] === "file");
    });

    it("the order of condition visit should be in DFS order", async () => {
      const actualSequence: string[] = [];
      sandbox.stub(mockUI, "inputText").callsFake(async (config: InputTextConfig) => {
        actualSequence.push(config.name);
        return ok({ type: "success", result: config.name });
      });
      const node: IQTreeNode = {
        data: {
          type: "text",
          title: "1",
          name: "1",
        },
        children: [
          {
            data: {
              type: "text",
              title: "2",
              name: "2",
            },
            children: [
              {
                data: {
                  type: "text",
                  title: "3",
                  name: "3",
                },
              },
            ],
          },
          {
            data: {
              type: "text",
              title: "4",
              name: "4",
            },
            condition: (inputs) => inputs["3"] === "3",
          },
        ],
      };

      const expectedSequence = ["1", "2", "3", "4"];

      const inputs = createInputs();
      const res = await traverse(node, inputs, mockUI);
      assert.isTrue(res.isOk());

      assert.sameOrderedMembers(expectedSequence, actualSequence);
    });
  });

  describe("questionVisitor", () => {
    let mockedEnvRestore: RestoreFn = () => {};
    afterEach(() => {
      mockedEnvRestore();
    });
    it("should return error for non-interactive mode", async () => {
      mockedEnvRestore = mockedEnv({ TEAMSFX_CLI_NEW_UX: "true" });
      const question: TextInputQuestion = {
        type: "text",
        name: "test",
        title: "test",
      };
      const inputs: Inputs = {
        platform: Platform.VSCode,
        nonInteractive: true,
      };
      const res = await questionVisitor(question, new MockUserInteraction(), inputs);
      assert.isTrue(res.isErr() && res.error instanceof MissingRequiredInputError);
    });

    it("should return empty option error for non-interactive mode", async () => {
      mockedEnvRestore = mockedEnv({ TEAMSFX_CLI_NEW_UX: "true" });
      const question: SingleSelectQuestion = {
        type: "singleSelect",
        name: "test",
        title: "test",
        staticOptions: [],
        skipSingleOption: true,
      };
      const inputs: Inputs = {
        platform: Platform.VSCode,
        nonInteractive: true,
      };
      const res = await questionVisitor(question, new MockUserInteraction(), inputs);
      assert.isTrue(res.isErr() && res.error instanceof EmptyOptionError);
    });

    it("should return single option for non-interactive mode", async () => {
      mockedEnvRestore = mockedEnv({ TEAMSFX_CLI_NEW_UX: "true" });
      const question: SingleSelectQuestion = {
        type: "singleSelect",
        name: "test",
        title: "test",
        staticOptions: ["a"],
        skipSingleOption: true,
      };
      const inputs: Inputs = {
        platform: Platform.VSCode,
        nonInteractive: true,
      };
      const res = await questionVisitor(question, new MockUserInteraction(), inputs);
      assert.isTrue(res.isOk() && res.value.type === "skip" && res.value.result === "a");
    });

    it("should return default value for non-interactive mode", async () => {
      mockedEnvRestore = mockedEnv({ TEAMSFX_CLI_NEW_UX: "true" });
      const question: SingleSelectQuestion = {
        type: "singleSelect",
        name: "test",
        title: "test",
        staticOptions: ["a", "b"],
        default: "b",
        skipSingleOption: true,
      };
      const inputs: Inputs = {
        platform: Platform.VSCode,
        nonInteractive: true,
      };
      const res = await questionVisitor(question, new MockUserInteraction(), inputs);
      assert.isTrue(res.isOk() && res.value.type === "skip" && res.value.result === "b");
    });
  });

  describe("loadOptions", async () => {
    it("load dynamic options", async () => {
      const options = await loadOptions(
        {
          type: "singleSelect",
          name: "test",
          title: "test",
          dynamicOptions: () => ["a"],
          staticOptions: [],
        },
        { platform: Platform.VSCode }
      );
      assert.deepEqual(options, ["a"]);
    });
  });
});
