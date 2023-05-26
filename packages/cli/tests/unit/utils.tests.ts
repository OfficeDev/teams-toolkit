// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as apis from "@microsoft/teamsfx-api";
import { Colors, Platform, QTreeNode } from "@microsoft/teamsfx-api";
import { PluginNames } from "@microsoft/teamsfx-core/build/component/constants";
import fs from "fs-extra";
import "mocha";
import mockedEnv from "mocked-env";
import sinon from "sinon";
import * as uuid from "uuid";
import {
  argsToInputs,
  flattenNodes,
  getChoicesFromQTNodeQuestion,
  getColorizedString,
  getIsM365,
  getSingleOptionString,
  getSystemInputs,
  getTeamsAppTelemetryInfoByEnv,
  getVersion,
  isWorkspaceSupported,
  readSettingsFileSync,
  sleep,
  toLocaleLowerCase,
  toYargsOptions,
} from "../../src/utils";
import { expect } from "./utils";

const staticOptions1: apis.StaticOptions = ["a", "b", "c"];
const staticOptions2: apis.StaticOptions = [
  { id: "a", cliName: "aa", label: "aaa" },
  { id: "b", cliName: "bb", label: "bbb" },
  { id: "c", cliName: "cc", label: "ccc" },
];

describe("Utils Tests", function () {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it("getChoicesFromQTNodeQuestion - string[]", () => {
    const question: apis.Question = {
      type: "singleSelect",
      name: "question",
      title: "getChoicesFromQTNodeQuestion",
      staticOptions: staticOptions1,
    };
    const answers = getChoicesFromQTNodeQuestion(question);
    expect(answers).deep.equals(["a", "b", "c"]);
  });

  it("getChoicesFromQTNodeQuestion - OptionItem[]", () => {
    const question: apis.Question = {
      type: "singleSelect",
      name: "question",
      title: "getChoicesFromQTNodeQuestion",
      staticOptions: staticOptions2,
    };
    const answers = getChoicesFromQTNodeQuestion(question);
    expect(answers).deep.equals(["aa", "bb", "cc"]);
  });

  it("getChoicesFromQTNodeQuestion - undefined", () => {
    const question: apis.Question = {
      type: "folder",
      name: "question",
      title: "getChoicesFromQTNodeQuestion",
    };
    const answers = getChoicesFromQTNodeQuestion(question);
    expect(answers).equals(undefined);
  });

  describe("getSingleOptionString", () => {
    const sandbox = sinon.createSandbox();

    before(() => {
      sandbox
        .stub(apis, "getSingleOption")
        .callsFake((q: apis.SingleSelectQuestion | apis.MultiSelectQuestion) => {
          if (q.type === "singleSelect") return q.staticOptions[0];
          else return [q.staticOptions[0]];
        });
    });

    after(() => {
      sandbox.restore();
    });

    it("singleSelect and returnObject", () => {
      const question: apis.Question = {
        type: "singleSelect",
        name: "question",
        title: "getSingleOptionString",
        returnObject: true,
        staticOptions: staticOptions2,
      };
      const answers = getSingleOptionString(question);
      expect(answers).equals("a");
    });

    it("multiSelect and returnObject", () => {
      const question: apis.Question = {
        type: "multiSelect",
        name: "question",
        title: "getSingleOptionString",
        returnObject: true,
        staticOptions: staticOptions2,
      };
      const answers = getSingleOptionString(question);
      expect(answers).deep.equals(["a"]);
    });

    it("singleSelect and not returnObject", () => {
      const question: apis.Question = {
        type: "singleSelect",
        name: "question",
        title: "getSingleOptionString",
        staticOptions: staticOptions1,
      };
      const answers = getSingleOptionString(question);
      expect(answers).equals("a");
    });
  });

  describe("toYargsOptions", () => {
    it("singleSelect and no default value", () => {
      const question: apis.Question = {
        type: "singleSelect",
        name: "question",
        title: "toYargsOptions",
        returnObject: true,
        staticOptions: staticOptions1,
      };
      const answer = toYargsOptions(question);
      expect(answer.choices).deep.equals(["a", "b", "c"]);
      expect(answer.array).to.be.false;
      expect("default" in answer).to.be.false;
    });

    it("singleSelect and default value", () => {
      const question: apis.Question = {
        type: "singleSelect",
        name: "question",
        title: "toYargsOptions",
        returnObject: true,
        staticOptions: staticOptions1,
        default: "A",
      };
      const answer = toYargsOptions(question);
      expect(answer.choices).deep.equals(["a", "b", "c"]);
      expect(answer.array).to.be.false;
      expect(answer.default).equals("a");
    });

    it("multiSelect and default value", () => {
      const question: apis.Question = {
        type: "multiSelect",
        name: "question",
        title: "toYargsOptions",
        returnObject: true,
        staticOptions: staticOptions2,
        default: ["AA"],
      };
      const answer = toYargsOptions(question);
      expect(answer.choices).deep.equals(["aa", "bb", "cc"]);
      expect(answer.array).to.be.true;
      expect(answer.default).deep.equals(["aa"]);
    });
  });

  it("toLocaleLowerCase", () => {
    expect(toLocaleLowerCase("MiNe")).equals("mine");
    expect(toLocaleLowerCase(["ItS", "HiS"])).deep.equals(["its", "his"]);
    expect(toLocaleLowerCase(undefined)).equals(undefined);
  });

  it("flattenNodes", () => {
    const root = new QTreeNode({
      type: "group",
    });
    root.children = [
      new QTreeNode({ type: "folder", name: "a", title: "aa" }),
      new QTreeNode({ type: "folder", name: "b", title: "bb" }),
    ];
    const answers = flattenNodes(root);
    expect(answers.map((a) => a.data)).deep.equals([
      { type: "group" },
      { type: "folder", name: "a", title: "aa" },
      { type: "folder", name: "b", title: "bb" },
    ]);
    expect(root.children).not.equals(undefined);
  });

  it("sleep", async () => {
    await sleep(0);
  });

  describe("readSettingsFileSync", async () => {
    const sandbox = sinon.createSandbox();

    before(() => {
      sandbox.stub(fs, "existsSync").callsFake((path: fs.PathLike) => {
        return path.toString().includes("real");
      });
      sandbox.stub(fs, "readJsonSync").callsFake((path: string) => {
        if (path.includes("realbuterror")) {
          throw Error("realbuterror");
        } else {
          return {};
        }
      });
      sandbox.stub(fs, "readFileSync").callsFake((path: any) => {
        if (path.includes("realbuterror")) {
          throw Error("realbuterror");
        } else {
          return `
version: 1.0.0
projectId: 00000000-0000-0000-0000-000000000000`;
        }
      });
    });

    after(() => {
      sandbox.restore();
    });

    it("Real Path", () => {
      const restore = mockedEnv({
        TEAMSFX_V3: "false",
      });
      const result = readSettingsFileSync("real");
      expect(result.isOk() ? result.value : result.error).deep.equals({});
      restore();
    });

    it("Real Path in V3", () => {
      const restore = mockedEnv({
        TEAMSFX_V3: "true",
      });
      try {
        const result = readSettingsFileSync("real");
        expect(result.isOk() ? result.value : result.error).deep.equals({
          projectId: "00000000-0000-0000-0000-000000000000",
          version: "1.0.0",
        });
      } finally {
        restore();
      }
    });

    it("Real Path but cannot read", () => {
      const result = readSettingsFileSync("realbuterror");
      expect(result.isOk() ? result.value : result.error.name).equals("ReadFileError");
    });

    it("Fake Path", () => {
      const result = readSettingsFileSync("fake");
      expect(result.isOk() ? result.value : result.error.name).equals("ConfigNotFound");
    });
  });

  describe("isWorkspaceSupported", async () => {
    const sandbox = sinon.createSandbox();

    before(() => {
      sandbox.stub(fs, "existsSync").callsFake((path: fs.PathLike) => {
        return path.toString().includes("real");
      });
    });

    after(() => {
      sandbox.restore();
    });

    it("Real Path", async () => {
      const result = isWorkspaceSupported("real");
      expect(result).equals(true);
    });

    it("Real Path in V3", async () => {
      const restore = mockedEnv({
        TEAMSFX_V3: "true",
      });
      try {
        const result = isWorkspaceSupported("real");
        expect(result).equals(true);
      } finally {
        restore();
      }
    });

    it("Fake Path", async () => {
      const result = isWorkspaceSupported("fake");
      expect(result).equals(false);
    });
  });

  describe("getTeamsAppTelemetryInfoByEnv", async () => {
    const sandbox = sinon.createSandbox();
    const env = "dev";
    const invalidProjectDir = "invaldProjectDir";
    const invalidStateProjectDir = "invaldStateProjectDir";
    const validProjectDir = "validProjectDir";
    const simpleProjectSettings = {
      appName: "testApp",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "fx-solution-azure",
        version: "1.0.0",
        hostType: "Azure",
        azureResources: [],
        capabilities: ["Tab"],
        activeResourcePlugins: ["fx-resource-appstudio"],
      },
      version: "2.0.0",
      programmingLanguage: "javascript",
    };
    const teamsAppId = "teamsAppId";
    const tenantId = "tenantId";

    before(() => {
      sandbox.stub(fs, "existsSync").callsFake((path: fs.PathLike) => {
        return true;
      });
      // sandbox.stub(utils, "isWorkspaceSupported").callsFake((file: string): boolean => {
      //   return true;
      // });

      sandbox.stub(fs, "readFileSync").callsFake((path: any): string | Buffer => {
        const file = path as string;
        if (file.includes("projectSettings.json")) {
          return JSON.stringify(simpleProjectSettings);
        } else if (file.includes(validProjectDir) && file.includes(`state.${env}.json`)) {
          return JSON.stringify({
            [PluginNames.APPST]: {
              teamsAppId: teamsAppId,
              tenantId: tenantId,
            },
          });
        } else if (file.includes(invalidStateProjectDir) && file.includes(`state.${env}.json`)) {
          return "! invalid JSON";
        } else {
          throw new Error("readJsonError");
        }
      });
    });

    after(() => {
      sandbox.restore();
    });

    it("Invalid Project Dir", async () => {
      const result = getTeamsAppTelemetryInfoByEnv(invalidProjectDir, env);
      expect(result).equals(undefined);
    });

    it("Invalid State File", async () => {
      const result = getTeamsAppTelemetryInfoByEnv(invalidStateProjectDir, env);
      expect(result).equals(undefined);
    });

    it("Valid State File", async () => {
      const result = getTeamsAppTelemetryInfoByEnv(validProjectDir, env);
      expect(result).deep.equals({ appId: teamsAppId, tenantId: tenantId });
    });
  });

  it("getSystemInputs", async () => {
    const inputs = getSystemInputs("real");
    expect(inputs.platform).equals(Platform.CLI);
    expect(inputs.projectPath).equals("real");
  });

  it("argsToInputs", async () => {
    const param = {
      folder: {},
      other: {},
    };
    const args = {
      folder: "real",
      other: "other",
      notExist: "notExist",
    };
    const inputs = argsToInputs(param, args);
    expect(inputs.projectPath).includes("real");
    expect(inputs.other).equals("other");
    expect("folder" in inputs).to.be.false;
    expect("notExist" in inputs).to.be.false;
  });

  it("getColorizedString", async () => {
    /// TODO: mock chalk and test
    const arr = Object.keys(Colors)
      .filter((v) => isNaN(Number(v)))
      .map((v, i) => i);
    getColorizedString(
      arr.map((v) => {
        return { content: String(v), color: v };
      })
    );
  });

  it("getVersion", async () => {
    getVersion();
  });

  describe("toLocaleLowerCase", () => {
    it("should work for input of type string and array of string", () => {
      expect(toLocaleLowerCase("AB")).equals("ab");
      expect(toLocaleLowerCase(["Ab", "BB"])).deep.equals(["ab", "bb"]);
    });
  });

  describe("getIsM365", async () => {
    const sandbox = sinon.createSandbox();

    before(() => {
      sandbox.stub(fs, "existsSync").callsFake((path: fs.PathLike) => {
        return path.toString().includes("real");
      });
      sandbox.stub(fs, "readJsonSync").callsFake((path: fs.PathLike) => {
        if (path.toString().includes("real")) {
          if (path.toString().includes("true")) {
            return { isM365: true };
          } else if (path.toString().includes("false")) {
            return { isM365: false };
          } else {
            return {};
          }
        } else {
          throw new Error(`ENOENT: no such file or directory, open '${path.toString()}'`);
        }
      });
    });

    after(() => {
      sandbox.restore();
    });

    it("No Root Folder", async () => {
      const result = getIsM365(undefined);
      expect(result).equals(undefined);
    });

    it("No File", async () => {
      const result = getIsM365("error");
      expect(result).equals(undefined);
    });

    it("isM365 == true", async () => {
      const restore = mockedEnv({ TEAMSFX_V3: "false" });
      const result = getIsM365("real.isM365=true");
      expect(result).equals("true");
      restore();
    });

    it("isM365 == false", async () => {
      const restore = mockedEnv({ TEAMSFX_V3: "false" });
      const result = getIsM365("real.isM365=false");
      expect(result).equals("false");
      restore();
    });

    it("isM365 == undefined", async () => {
      const result = getIsM365("real.isM365=undefined");
      expect(result).equals(undefined);
    });
  });
});
