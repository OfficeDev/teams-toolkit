// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as prompts from "@inquirer/prompts";
import { CancelablePromise } from "@inquirer/type";
import {
  Colors,
  LogLevel,
  MultiSelectConfig,
  SelectFileConfig,
  SelectFilesConfig,
  SelectFolderConfig,
  SingleSelectConfig,
  ok,
} from "@microsoft/teamsfx-api";
import { MissingRequiredInputError, SelectSubscriptionError } from "@microsoft/teamsfx-core";
import "mocha";
import sinon from "sinon";
import LogProvider from "../../src/commonlib/log";
import * as customizedPrompts from "../../src/prompts";
import UI from "../../src/userInteraction";
import { getColorizedString } from "../../src/utils";
import { expect } from "./utils";
import { globals } from "../../src/globals";

describe("User Interaction Tests", function () {
  const sandbox = sinon.createSandbox();
  let logs: [LogLevel, string][] = [];

  before(() => {
    sandbox.stub(prompts, "input").get(() => (config: any) => {
      return new CancelablePromise((resolve) => resolve(config.default ?? "Input Result"));
    });
    sandbox.stub(prompts, "password").get(() => (config: any) => {
      return new CancelablePromise((resolve) => resolve("Password Result"));
    });
    sandbox.stub(prompts, "confirm").get(() => (config: any) => {
      return new CancelablePromise((resolve) => resolve(config.default ?? true));
    });
    sandbox
      .stub(customizedPrompts, "select")
      .get(() => (config: customizedPrompts.SelectConfig) => {
        const value =
          config.defaultValue ??
          (
            config.choices.filter(
              (x) => !prompts.Separator.isSeparator(x)
            )[0] as customizedPrompts.SelectChoice
          ).id;
        return new CancelablePromise<string>((resolve) => resolve(value));
      });
    sandbox
      .stub(customizedPrompts, "checkbox")
      .get(() => (config: customizedPrompts.CheckboxConfig) => {
        const values: any =
          config.defaultValues ??
          config.choices
            .filter((x) => !prompts.Separator.isSeparator(x) && x.checked)
            .map((x) => (x as customizedPrompts.SelectChoice).id);
        return new CancelablePromise((resolve) => resolve(values));
      });
    sandbox.stub(LogProvider, "necessaryLog").callsFake((level: LogLevel, message: string) => {
      logs.push([level, message]);
    });
  });

  after(() => {
    sandbox.restore();
  });

  beforeEach(() => {
    UI.clearPresetAnswers();
    UI.interactive = true;
    globals.options = [];
    logs = [];
  });

  it("Check process.env", () => {
    expect(UI.ciEnabled).equals(process.env.CI_EANBLED === "true");
  });

  it("Update/Remove Preset Answers", () => {
    const params = { a: undefined, b: undefined, c: undefined };
    const answers = { a: "123", c: ["1", "2"], d: undefined };

    UI.updatePresetAnswers(params, answers);
    expect(UI["presetAnswers"].get("a")).equals("123");
    expect(UI["presetAnswers"].has("b")).to.be.false;
    expect(UI["presetAnswers"].get("c")).deep.equals(["1", "2"]);
    expect(UI["presetAnswers"].has("d")).to.be.false;

    UI.removePresetAnswers(["a", "c"]);
    expect(UI["presetAnswers"].has("a")).to.be.false;
    expect(UI["presetAnswers"].has("c")).to.be.false;
  });

  describe("Single Select Option", async () => {
    const sandbox = sinon.createSandbox();
    afterEach(() => {
      sandbox.restore();
    });
    it("(Hardcode) Subscription: EmptySubConfigOptions Error", async () => {
      const config: SingleSelectConfig = {
        name: "subscription",
        title: "Select a subscription",
        options: [],
      };
      const result = await UI.selectOption(config);
      expect(result.isOk() ? result.value.result : result.error.name).equals(
        new SelectSubscriptionError().name
      );
    });

    it("(Hardcode) Subscription: only one sub", async () => {
      const config: SingleSelectConfig = {
        name: "subscription",
        title: "Select a subscription",
        options: ["a"],
      };
      const result = await UI.selectOption(config);
      expect(result.isOk() ? result.value.result : result.error).deep.equals("a");
      expect(logs.length).equals(1);
      expect(logs[0][0]).equals(LogLevel.Warning);
    });

    it("Get Value from Preset Answers", async () => {
      UI.updatePresetAnswer("subscription", "c");
      const config: SingleSelectConfig = {
        name: "subscription",
        title: "Select a subscription",
        options: ["a", "b", "c"],
      };
      const result = await UI.selectOption(config);
      expect(result.isOk() ? result.value.result : result.error).deep.equals("c");
    });

    it("Get Value from Preset Answers (OptionItem)", async () => {
      UI.updatePresetAnswer("subscription", "c");
      const config: SingleSelectConfig = {
        name: "subscription",
        title: "Select a subscription",
        options: [
          {
            id: "a",
            cliName: "aa",
            label: "aaa",
          },
          {
            id: "b",
            cliName: "bb",
            label: "bbb",
          },
          {
            id: "c",
            cliName: "cc",
            label: "ccc",
          },
        ],
      };
      {
        const result = await UI.selectOption(config);
        expect(result.isOk() ? result.value.result : result.error).deep.equals("c");
      }
      {
        UI.updatePresetAnswer("subscription", "cc");
        const result = await UI.selectOption(config);
        expect(result.isOk() ? result.value.result : result.error).deep.equals("c");
      }
    });
    it("Auto skip for single option (return object = true)", async () => {
      const config: SingleSelectConfig = {
        name: "test",
        title: "test",
        options: [
          {
            id: "a",
            cliName: "aa",
            label: "aaa",
          },
        ],
        skipSingleOption: true,
        returnObject: true,
      };
      const result = await UI.selectOption(config);
      expect(result.isOk());
      if (result.isOk()) {
        expect(result.value.result).deep.equals({
          id: "a",
          cliName: "aa",
          label: "aaa",
        });
      }
    });
    it("Auto skip for single option (return object = false)", async () => {
      const config: SingleSelectConfig = {
        name: "test",
        title: "test",
        options: [
          {
            id: "a",
            cliName: "aa",
            label: "aaa",
          },
        ],
        skipSingleOption: true,
        returnObject: false,
      };
      const result = await UI.selectOption(config);
      expect(result.isOk());
      if (result.isOk()) {
        expect(result.value.result).equals("a");
      }
    });

    it("Auto skip for single option 1", async () => {
      const config: SingleSelectConfig = {
        name: "test",
        title: "test",
        options: ["a"],
        skipSingleOption: true,
        returnObject: false,
      };
      const result = await UI.selectOption(config);
      expect(result.isOk());
      if (result.isOk()) {
        expect(result.value.result).equals("a");
      }
    });

    it("Auto skip for single option 2", async () => {
      const config: SingleSelectConfig = {
        name: "test",
        title: "test",
        options: ["a"],
        skipSingleOption: true,
        returnObject: true,
      };
      const result = await UI.selectOption(config);
      expect(result.isOk());
      if (result.isOk()) {
        expect(result.value.result).equals("a");
      }
    });

    it("invalid option", async () => {
      sandbox.stub(UI, "singleSelect").resolves(ok("c"));
      const config: SingleSelectConfig = {
        name: "test",
        title: "test",
        options: ["a"],
      };
      const result = await UI.selectOption(config);
      expect(result.isErr());
      if (result.isErr()) {
        expect(result.error.name).equals("InputValidationError");
      }
    });
  });

  describe("Multi Select Options", () => {
    const sandbox = sinon.createSandbox();
    afterEach(() => {
      sandbox.restore();
    });
    it("Get Value from Preset Answers", async () => {
      UI.updatePresetAnswer("resources", ["c"]);
      const config: MultiSelectConfig = {
        name: "resources",
        title: "Select resources",
        options: ["a", "b", "c"],
      };
      const result = await UI.selectOptions(config);
      expect(result.isOk() ? result.value.result : result.error).deep.equals(["c"]);
    });

    it("Get Value from Preset Answers (OptionItem)", async () => {
      UI.updatePresetAnswer("resources", ["b", "c"]);
      const config: MultiSelectConfig = {
        name: "resources",
        title: "Select resources",
        options: [
          {
            id: "a",
            cliName: "aa",
            label: "aaa",
          },
          {
            id: "b",
            cliName: "bb",
            label: "bbb",
          },
          {
            id: "c",
            cliName: "cc",
            label: "ccc",
          },
        ],
      };
      {
        const result = await UI.selectOptions(config);
        expect(result.isOk() ? result.value.result : result.error).deep.equals(["b", "c"]);
      }
      {
        UI.updatePresetAnswer("resources", ["bb", "cc"]);
        const result = await UI.selectOptions(config);
        expect(result.isOk() ? result.value.result : result.error).deep.equals(["b", "c"]);
      }
    });

    it("Auto skip for single option (return object = true)", async () => {
      const config: MultiSelectConfig = {
        name: "test",
        title: "test",
        options: [
          {
            id: "a",
            cliName: "aa",
            label: "aaa",
          },
        ],
        skipSingleOption: true,
        returnObject: true,
      };
      const result = await UI.selectOptions(config);
      expect(result.isOk());
      if (result.isOk()) {
        expect(result.value.result).deep.equals([
          {
            id: "a",
            cliName: "aa",
            label: "aaa",
          },
        ]);
      }
    });
    it("Auto skip for single option (return object = false)", async () => {
      const config: MultiSelectConfig = {
        name: "test",
        title: "test",
        options: [
          {
            id: "a",
            cliName: "aa",
            label: "aaa",
          },
        ],
        skipSingleOption: true,
        returnObject: false,
      };
      const result = await UI.selectOptions(config);
      expect(result.isOk());
      if (result.isOk()) {
        expect(result.value.result).deep.equals(["a"]);
      }
    });

    it("Auto skip for single option 1", async () => {
      const config: MultiSelectConfig = {
        name: "test",
        title: "test",
        options: ["a"],
        skipSingleOption: true,
        returnObject: false,
      };
      const result = await UI.selectOptions(config);
      expect(result.isOk());
      if (result.isOk()) {
        expect(result.value.result).deep.equals(["a"]);
      }
    });

    it("Auto skip for single option 2", async () => {
      const config: MultiSelectConfig = {
        name: "test",
        title: "test",
        options: ["a"],
        skipSingleOption: true,
        returnObject: true,
      };
      const result = await UI.selectOptions(config);
      expect(result.isOk());
      if (result.isOk()) {
        expect(result.value.result).deep.equals(["a"]);
      }
    });

    it("invalid options", async () => {
      sandbox.stub(UI, "multiSelect").resolves(ok(["c"]));
      const config: MultiSelectConfig = {
        name: "test",
        title: "test",
        options: ["a"],
      };
      const result = await UI.selectOptions(config);
      expect(result.isErr());
      if (result.isErr()) {
        expect(result.error.name).equals("InputValidationError");
      }
    });
  });

  it("Multi Select - default value", async () => {
    const choices = [1, 2, 3].map((x) => ({
      id: `id${x}`,
      title: `title ${x}`,
      detail: `detail ${x}`,
    }));
    const result = await UI.multiSelect("test", "Select a string", choices, ["id1", "id2"]);
    expect(result.isOk() ? result.value : result.error).to.be.deep.equals(["id1", "id2"]);
  });

  it("Multi Select - non interactive and no default value", async () => {
    UI.interactive = false;
    const choices = [1, 2, 3].map((x) => ({
      id: `id${x}`,
      title: `title ${x}`,
      detail: `detail ${x}`,
    }));
    const result = await UI.multiSelect("test", "Select a string", choices);
    expect(result.isOk() ? result.value : result.error).to.be.deep.equals([]);
  });

  it("Multi Select - interactive and no default value", async () => {
    const choices = [1, 2, 3].map((x) => ({
      id: `id${x}`,
      title: `title ${x}`,
      detail: `detail ${x}`,
    }));
    const result = await UI.multiSelect("test", "Select a string", choices);
    expect(result.isOk() ? result.value : result.error).to.be.deep.equals([]);
  });

  it("Multi Select - error", async () => {
    globals.options = ["test"];
    UI.interactive = false;
    const choices = [1, 2, 3].map((x) => ({
      id: `id${x}`,
      title: `title ${x}`,
      detail: `detail ${x}`,
    }));
    const result = await UI.multiSelect("test", "Select a string", choices);
    expect(result.isOk() ? result.value : result.error).instanceOf(MissingRequiredInputError);
  });

  it("Password - non interactive and default value", async () => {
    UI.interactive = false;
    const result = await UI.password("test", "Input the password", "default");
    expect(result.isOk() ? result.value : result.error).equals("default");
  });

  it("Password - non interactive and no default value", async () => {
    UI.interactive = false;
    const result = await UI.password("test", "Input the password");
    expect(result.isOk() ? result.value : result.error).equals("");
  });

  it("Password - interactive and no default value", async () => {
    const result = await UI.password("test", "Input the password");
    expect(result.isOk() ? result.value : result.error).equals("Password Result");
  });

  it("Single Select File", async () => {
    const config: SelectFileConfig = {
      name: "path",
      title: "Select a path",
    };
    const result = await UI.selectFile(config);
    expect(result.isOk() ? result.value.result : result.error).deep.equals("./");
  });

  it("Multi Select Files", async () => {
    UI.updatePresetAnswer("paths", "./ ; ./");
    const config: SelectFilesConfig = {
      name: "paths",
      title: "Select a path",
    };
    const result = await UI.selectFiles(config);
    expect(result.isOk() ? result.value.result : result.error).deep.equals(["./", "./"]);
  });

  it("Multi Select Folder", async () => {
    const config: SelectFolderConfig = {
      name: "folder",
      title: "Select a folder",
    };
    const result = await UI.selectFolder(config);
    expect(result.isOk() ? result.value.result : result.error).deep.equals("./");
  });

  describe("Show Message", () => {
    const levels: ["info" | "warn" | "error", LogLevel][] = [
      ["info", LogLevel.Info],
      ["warn", LogLevel.Warning],
      ["error", LogLevel.Error],
    ];
    const msg1 = "No color";
    const msg2: Array<{ content: string; color: Colors }> = [
      { content: "BRIGHT_WHITE", color: Colors.BRIGHT_WHITE },
      { content: "WHITE", color: Colors.WHITE },
      { content: "BRIGHT_MAGENTA", color: Colors.BRIGHT_MAGENTA },
    ];
    const msgs = [msg1, msg2];
    const modals = [true, false];
    const items = ["first", "second"];

    it("items.length is equal to 0", async () => {
      const answers: [LogLevel, string][] = [];
      for (const [lv0, lv1] of levels) {
        for (const msg of msgs) {
          let trueMsg: string;
          if (typeof msg === "string") {
            trueMsg = msg;
          } else {
            if (lv0 === "info") {
              trueMsg = getColorizedString(msg);
            } else {
              trueMsg = msg.map((x) => x.content).join("");
            }
          }
          for (const modal of modals) {
            answers.push([lv1, trueMsg]);
            const result = await UI.showMessage(lv0, msg, modal);
            expect(result.isOk() ? result.value : result.error).equals(undefined);
            expect(logs).deep.equals(answers);
          }
        }
      }
    });

    it("items.length is equal to 1", async () => {
      for (const [lv0, _] of levels) {
        for (const msg of msgs) {
          for (const modal of modals) {
            const result = await UI.showMessage(lv0, msg, modal, items[0]);
            expect(result.isOk() ? result.value : result.error).equals(items[0]);
          }
        }
      }
    });

    it("items.length is bigger than 1", async () => {
      for (const [lv0, _] of levels) {
        for (const msg of msgs) {
          for (const modal of modals) {
            const result = await UI.showMessage(lv0, msg, modal, items[0], items[1]);
            expect(result.isOk() ? result.value : result.error).equals(items[0]);
          }
        }
      }
    });
  });

  it("Create Progress Bar", async () => {
    UI.createProgressBar("title", 3);
  });
});
