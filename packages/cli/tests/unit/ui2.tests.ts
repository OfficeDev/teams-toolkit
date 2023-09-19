import {
  InputTextConfig,
  MultiSelectConfig,
  SingleSelectConfig,
  UserError,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import {
  InputValidationError,
  SelectSubscriptionError,
  UnhandledError,
} from "@microsoft/teamsfx-core";
import { assert } from "chai";
import inquirer from "inquirer";
import "mocha";
import * as sinon from "sinon";
import UI from "../../src/userInteraction";
import fs from "fs-extra";

describe("UserInteraction(CLI)", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    sandbox.stub(UI, "createProgressBar").returns({
      start: async (s) => {},
      next: async (s) => {},
      end: async (s) => {},
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("loadSelectDynamicData", async () => {
    it("happy path", async () => {
      const config: SingleSelectConfig = {
        name: "test",
        title: "test",
        options: async () => ["a", "b", "c"],
        default: async () => "a",
      };
      const result = await UI.loadSelectDynamicData(config);
      assert.isTrue(result.isOk());
      assert.deepEqual(config.options, ["a", "b", "c"]);
      assert.equal(config.default, "a");
    });
    it("throw error", async () => {
      const config: SingleSelectConfig = {
        name: "test",
        title: "test",
        options: async () => {
          throw new Error("test");
        },
      };
      const result = await UI.loadSelectDynamicData(config);
      assert.isTrue(result.isErr());
    });
    it("no need to call function", async () => {
      const config: SingleSelectConfig = {
        name: "test",
        title: "test",
        options: ["a", "b", "c"],
      };
      const result = await UI.loadSelectDynamicData(config);
      assert.isTrue(result.isOk());
      assert.deepEqual(config.options, ["a", "b", "c"]);
    });
  });

  describe("loadDefaultValue", async () => {
    it("happy path", async () => {
      const config: SingleSelectConfig = {
        name: "test",
        title: "test",
        options: ["a", "b", "c"],
        default: async () => "a",
      };
      const result = await UI.loadDefaultValue(config);
      assert.isTrue(result.isOk());
      assert.equal(config.default, "a");
    });
    it("throw error", async () => {
      const config: SingleSelectConfig = {
        name: "test",
        title: "test",
        options: ["a", "b", "c"],
        default: async () => {
          throw new Error("test");
        },
      };
      const result = await UI.loadDefaultValue(config);
      assert.isTrue(result.isErr());
    });
    it("no need to call function", async () => {
      const config: SingleSelectConfig = {
        name: "test",
        title: "test",
        options: ["a", "b", "c"],
        default: "a",
      };
      const result = await UI.loadDefaultValue(config);
      assert.isTrue(result.isOk());
    });
  });

  describe("selectOptions", () => {
    it("loadSelectDynamicData throw error", async () => {
      sandbox.stub(UI, "loadSelectDynamicData").resolves(err(new UserError({})));
      const config: MultiSelectConfig = {
        name: "test",
        title: "test",
        options: async () => {
          throw new Error("test");
        },
      };
      const result = await UI.selectOptions(config);
      assert.isTrue(result.isErr());
    });
  });

  describe("selectOption", () => {
    it("loadSelectDynamicData throw error", async () => {
      sandbox.stub(UI, "loadSelectDynamicData").resolves(err(new UserError({})));
      const config: SingleSelectConfig = {
        name: "test",
        title: "test",
        options: async () => {
          throw new Error("test");
        },
      };
      const result = await UI.selectOption(config);
      assert.isTrue(result.isErr());
    });
    it("SelectSubscriptionError", async () => {
      sandbox.stub(inquirer, "prompt").rejects(new Error("test"));
      const config: SingleSelectConfig = {
        name: "subscription",
        title: "select subscription",
        options: [],
      };
      const result = await UI.selectOption(config);
      assert.isTrue(result.isErr());
      if (result.isErr()) {
        assert.isTrue(result.error instanceof SelectSubscriptionError);
      }
    });
  });

  describe("inputText", () => {
    it("load default value error", async () => {
      const res = await UI.inputText({
        title: "test",
        name: "test",
        default: async () => {
          throw new Error();
        },
      });
      assert.isTrue(res.isErr());
    });
    it("InputValidationError", async () => {
      const config: InputTextConfig = {
        name: "testInput",
        title: "input text",
        validation: (input: string) => {
          return "failed";
        },
      };
      UI.updatePresetAnswer("testInput", "valuebrabrabra");
      const result = await UI.inputText(config);
      assert.isTrue(result.isErr());
      if (result.isErr()) {
        assert.isTrue(result.error instanceof InputValidationError);
      }
    });
    it("UnhandledError", async () => {
      sandbox.stub(inquirer, "prompt").rejects(new Error("test"));
      const config: InputTextConfig = {
        name: "testInput",
        title: "input text",
      };
      UI.interactive = true;
      UI.clearPresetAnswers();
      const result = await UI.inputText(config);
      assert.isTrue(result.isErr());
      if (result.isErr()) {
        assert.isTrue(result.error instanceof UnhandledError);
      }
    });
    it("InputValidationError - pass validation but failed on additionalValidation", async () => {
      const config: InputTextConfig = {
        name: "testInput",
        title: "input text",
        validation: (input: string) => {
          return undefined;
        },
        additionalValidationOnAccept: (input: string) => {
          return "failed";
        },
      };
      UI.updatePresetAnswer("testInput", "somevalue");
      const result = await UI.inputText(config);
      assert.isTrue(result.isErr());
      if (result.isErr()) {
        assert.isTrue(result.error instanceof InputValidationError);
      }
    });
    it("InputValidationError -failed on additionalValidation", async () => {
      const config: InputTextConfig = {
        name: "testInput",
        title: "input text",
        additionalValidationOnAccept: (input: string) => {
          return "failed";
        },
      };
      UI.updatePresetAnswer("testInput", "somevalue");
      const result = await UI.inputText(config);
      assert.isTrue(result.isErr());
      if (result.isErr()) {
        assert.isTrue(result.error instanceof InputValidationError);
      }
    });
  });

  describe("selectFile", () => {
    it("load default value error", async () => {
      const res = await UI.selectFile({
        title: "test",
        name: "test",
        default: async () => {
          throw new Error();
        },
      });
      assert.isTrue(res.isErr());
    });
  });

  describe("selectFiles", () => {
    it("load default value error", async () => {
      const res = await UI.selectFiles({
        title: "test",
        name: "test",
        default: async () => {
          throw new Error();
        },
      });
      assert.isTrue(res.isErr());
    });
  });

  describe("selectFolder", () => {
    it("load default value error", async () => {
      const res = await UI.selectFolder({
        title: "test",
        name: "test",
        default: async () => {
          throw new Error();
        },
      });
      assert.isTrue(res.isErr());
    });
  });

  describe("selectFileOrInput", () => {
    it("happy path", async () => {
      UI.updatePresetAnswer("test", "path");
      const res = await UI.selectFileOrInput({
        name: "test",
        title: "test",
        inputBoxConfig: {
          title: "test",
          name: "test",
          validation: (input: string) => {
            return undefined;
          },
        },
        inputOptionItem: {
          id: "test",
          label: "test",
        },
      });
      assert.isTrue(res.isOk());
    });

    it("load default value error", async () => {
      const res = await UI.selectFileOrInput({
        name: "test",
        title: "test",
        inputBoxConfig: {
          title: "test",
          name: "test",
          default: async () => {
            throw new Error();
          },
        },
        inputOptionItem: {
          id: "test",
          label: "test",
        },
      });
      assert.isTrue(res.isErr());
    });
  });
});
