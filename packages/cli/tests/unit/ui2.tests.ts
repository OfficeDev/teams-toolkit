// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as inquirer from "@inquirer/prompts";
import {
  InputTextConfig,
  MultiSelectConfig,
  SingleSelectConfig,
  UserError,
  err,
} from "@microsoft/teamsfx-api";
import { SelectSubscriptionError, UnhandledError } from "@microsoft/teamsfx-core";
import { assert } from "chai";
import "mocha";
import * as sinon from "sinon";
import UI from "../../src/userInteraction";

describe("UserInteraction(CLI) 2", () => {
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
    afterEach(() => {
      sandbox.restore();
    });
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
    it("UnhandledError", async () => {
      sandbox.stub(UI, "input").resolves(err(new UnhandledError(new Error("test"))));
      const config: InputTextConfig = {
        name: "testInput",
        title: "input text",
      };
      const result = await UI.inputText(config);
      assert.isTrue(result.isErr());
      if (result.isErr()) {
        assert.isTrue(result.error instanceof UnhandledError);
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
      sandbox.stub(inquirer, "input").resolves("somevalue");
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
