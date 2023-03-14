// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";
import * as apis from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import {
  Colors,
  ConfigFolderName,
  InputConfigsFolderName,
  ok,
  Platform,
  ProjectSettingsFileName,
  QTreeNode,
  UserError,
} from "@microsoft/teamsfx-api";
import sinon from "sinon";
import * as uuid from "uuid";

import {
  argsToInputs,
  flattenNodes,
  getChoicesFromQTNodeQuestion,
  getColorizedString,
  getProjectId,
  getSingleOptionString,
  getSystemInputs,
  getVersion,
  getConfigPath,
  readEnvJsonFile,
  readEnvJsonFileSync,
  readProjectSecrets,
  readSettingsFileSync,
  setSubscriptionId,
  sleep,
  toLocaleLowerCase,
  toYargsOptions,
  getTeamsAppTelemetryInfoByEnv,
  getIsM365,
  isSpfxProject,
  readLocalStateJsonFile,
  compare,
  isWorkspaceSupported,
} from "../../src/utils";
import { expect } from "./utils";
import AzureAccountManager from "../../src/commonlib/azureLogin";
import { environmentManager, FxCore, isV3Enabled } from "@microsoft/teamsfx-core";
import { PluginNames } from "@microsoft/teamsfx-core/build/component/constants";
import mockedEnv from "mocked-env";
import * as ProjectSettingsHelperV3 from "@microsoft/teamsfx-core/build/common/projectSettingsHelperV3";
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

  it("readLocalStateJsonFile - success", () => {
    sandbox.stub(fs, "existsSync").returns(true);
    sandbox.stub(fs, "readJsonSync").returns({});
    const res = readLocalStateJsonFile("real");
    expect((res as any).value).to.deep.equal({});
  });

  it("readLocalStateJsonFile - ConfigNotFoundError", () => {
    sandbox.stub(fs, "existsSync").returns(false);
    const res = readLocalStateJsonFile("fake");
    expect((res as any).error.name).to.equal("ConfigNotFound");
  });

  it("readLocalStateJsonFile - throw Error", () => {
    sandbox.stub(fs, "existsSync").returns(true);
    sandbox.stub(fs, "readJsonSync").throws(new Error());
    const res = readLocalStateJsonFile("fake");
    expect((res as any).error.name).to.equal("ReadFileError");
  });

  it("compare", () => {
    {
      const res = compare("1.1.1", "1.1.1");
      expect(res === 0).to.be.true;
    }
    {
      const res = compare("1.1.1", "1.1.2");
      expect(res === -1).to.be.true;
    }
    {
      const res = compare("1.2.1", "1.1.2");
      expect(res === 1).to.be.true;
    }
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

  it("getConfigPath", async () => {
    const answer = getConfigPath("123", "abc");
    expect(answer).includes(path.resolve("123", ".fx", "abc"));
  });

  describe("readEnvJsonFile", async () => {
    const sandbox = sinon.createSandbox();

    before(() => {
      sandbox.stub(fs, "existsSync").callsFake((path: fs.PathLike) => {
        return path.toString().includes("real");
      });
      sandbox.stub(fs, "readJson").callsFake(async (path: string) => {
        if (path.includes("realbuterror")) {
          throw Error("realbuterror");
        } else {
          return {};
        }
      });
    });

    after(() => {
      sandbox.restore();
    });

    it("Real Path", async () => {
      const result = await readEnvJsonFile("real", environmentManager.getDefaultEnvName());
      expect(result.isOk() ? result.value : result.error).deep.equals({});
    });

    it("Real Path but cannot read", async () => {
      const result = await readEnvJsonFile("realbuterror", environmentManager.getDefaultEnvName());
      expect(result.isOk() ? result.value : result.error.name).equals("ReadFileError");
    });

    it("Fake Path", async () => {
      const result = await readEnvJsonFile("fake", environmentManager.getDefaultEnvName());
      expect(result.isOk() ? result.value : result.error.name).equals("ConfigNotFound");
    });
  });

  describe("readEnvJsonFileSync", async () => {
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
    });

    after(() => {
      sandbox.restore();
    });

    it("Real Path", () => {
      const result = readEnvJsonFileSync("real", environmentManager.getDefaultEnvName());
      expect(result.isOk() ? result.value : result.error).deep.equals({});
    });

    it("Real Path but cannot read", () => {
      const result = readEnvJsonFileSync("realbuterror", environmentManager.getDefaultEnvName());
      expect(result.isOk() ? result.value : result.error.name).equals("ReadFileError");
    });

    it("Fake Path", () => {
      const result = readEnvJsonFileSync("fake", environmentManager.getDefaultEnvName());
      expect(result.isOk() ? result.value : result.error.name).equals("ConfigNotFound");
    });
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

  describe("readProjectSecrets", async () => {
    const sandbox = sinon.createSandbox();

    before(() => {
      sandbox.stub(fs, "existsSync").callsFake((path: fs.PathLike) => {
        return path.toString().includes("real");
      });
      sandbox.stub(fs, "readFile").callsFake(async (file: string | Buffer | number) => {
        if (typeof file === "string" && file.includes("realbuterror")) {
          throw Error("realbuterror");
        } else {
          return Promise.resolve(Buffer.from(""));
        }
      });
    });

    after(() => {
      sandbox.restore();
    });

    it("Real Path", async () => {
      const result = await readProjectSecrets("real", environmentManager.getDefaultEnvName());
      expect(result.isOk() ? result.value : result.error).deep.equals({});
    });

    it("Real Path but cannot read", async () => {
      const result = await readProjectSecrets(
        "realbuterror",
        environmentManager.getDefaultEnvName()
      );
      expect(result.isOk() ? result.value : result.error.name).equals("ReadFileError");
    });

    it("Fake Path", async () => {
      const result = await readProjectSecrets("fake", environmentManager.getDefaultEnvName());
      expect(result.isOk() ? result.value : result.error.name).equals("UserdataNotFound");
    });
  });

  describe("setSubscriptionId", async () => {
    const sandbox = sinon.createSandbox();

    before(() => {
      sandbox.stub(fs, "existsSync").callsFake((path: fs.PathLike) => {
        return path.toString().includes("real");
      });
      sandbox.stub(fs, "readJson").callsFake(async (path: string) => {
        if (path.includes("real")) {
          return { solution: {} };
        } else {
          throw Error("not real");
        }
      });
      sandbox.stub(fs, "readJsonSync").callsFake((path: string) => {
        if (path.includes("real")) {
          return { solution: {} };
        } else {
          throw Error("not real");
        }
      });
      sandbox.stub(AzureAccountManager, "setSubscription");
      sandbox.stub(AzureAccountManager, "listSubscriptions").returns(
        Promise.resolve([
          {
            subscriptionName: "real",
            tenantId: "real",
            subscriptionId: "real",
          },
        ])
      );
      sandbox.stub(fs, "writeFile").callsFake(async (folder: any, content: string) => {
        const obj = JSON.parse(content);
        expect(obj).deep.equals({
          solution: {
            subscriptionId: "real",
            tenantId: "real",
          },
        });
      });
    });

    after(() => {
      sandbox.restore();
    });

    it("Real Path", async () => {
      const result = await setSubscriptionId("real", "real");
      expect(result.isOk() ? result.value : result.error).equals(null);
    });

    it("Fake Path", async () => {
      const result = await setSubscriptionId("fake", "fake");
      expect(result.isOk() ? result.value : result.error).instanceOf(UserError);
      expect(result.isOk() ? result.value : result.error.name).equals("WorkspaceNotSupported");
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

  describe("getProjectId", async () => {
    const sandbox = sinon.createSandbox();

    const oldSettingsPath = path.join(`.${ConfigFolderName}`, "settings.json");
    const newSettingsPath = path.join(
      `.${ConfigFolderName}`,
      InputConfigsFolderName,
      ProjectSettingsFileName
    );

    before(() => {
      sandbox.stub(fs, "existsSync").callsFake((path: fs.PathLike) => {
        return path.toString().includes("real");
      });
      sandbox.stub(fs, "readJsonSync").callsFake((path: fs.PathLike) => {
        if (path.toString().includes("real")) {
          return { projectId: "real" };
        } else {
          throw new Error(`ENOENT: no such file or directory, open '${path.toString()}'`);
        }
      });
    });

    after(() => {
      sandbox.restore();
    });

    it("No Root Folder", async () => {
      const result = getProjectId(undefined);
      expect(result).equals(undefined);
    });

    it("Real Path", async () => {
      const result = getProjectId("real");
      expect(result).equals("real");
    });

    it("Fake Path", async () => {
      const result = getProjectId("fake");
      expect(result).equals(undefined);
    });
  });

  describe("getProjectId fallback logic", async () => {
    const sandbox = sinon.createSandbox();

    const oldSettingsPath = path.join(`.${ConfigFolderName}`, "settings.json");
    const newSettingsPath = path.join(
      `.${ConfigFolderName}`,
      InputConfigsFolderName,
      ProjectSettingsFileName
    );

    let oldExist = false;
    let newExist = false;

    before(() => {
      sandbox.stub(fs, "existsSync").callsFake((pathLike: fs.PathLike) => {
        const _path = pathLike.toString();
        if (path.normalize(_path).endsWith(oldSettingsPath)) {
          return oldExist;
        } else if (path.normalize(_path).endsWith(newSettingsPath)) {
          return newExist;
        } else {
          return _path.includes("real");
        }
      });
      sandbox.stub(fs, "readJsonSync").callsFake((pathLike: fs.PathLike) => {
        const _path = pathLike.toString();
        if (path.normalize(_path).endsWith(oldSettingsPath)) {
          if (oldExist) {
            return {
              projectId: "old",
            };
          } else {
            throw new Error(`ENOENT: no such file or directory, open '${_path.toString()}'`);
          }
        } else if (path.normalize(_path).endsWith(newSettingsPath)) {
          if (newExist) {
            return {
              projectId: "new",
            };
          } else {
            throw new Error(`ENOENT: no such file or directory, open '${_path.toString()}'`);
          }
        } else {
          return undefined;
        }
      });
    });

    after(() => {
      sandbox.restore();
    });

    it("Multi env enabled and both new files and old files exist", async () => {
      const restore = mockedEnv({ TEAMSFX_V3: "false" });
      oldExist = true;
      newExist = true;
      const result = getProjectId("real");
      expect(result).equals("new");
      restore();
    });

    it("Multi env enabled and only new files exist", async () => {
      const restore = mockedEnv({ TEAMSFX_V3: "false" });
      oldExist = false;
      newExist = true;
      const result = getProjectId("real");
      expect(result).equals("new");
      restore();
    });

    it("Multi env enabled and only old files exist", async () => {
      oldExist = true;
      newExist = false;
      const result = getProjectId("real");
      expect(result).equals("old");
    });

    it("Multi env enabled and neither new nor old files exist", async () => {
      oldExist = false;
      newExist = false;
      const result = getProjectId("real");
      expect(result).equals(undefined);
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

  it("isSpfxProject", async () => {
    sandbox.stub(ProjectSettingsHelperV3, "hasSPFxTab").resolves(ok(undefined));
    const mockFxCore = {
      getProjectConfig: async () => {
        return ok(undefined);
      },
    } as any;
    const result = await isSpfxProject("real", mockFxCore);
    expect(result.isOk()).to.be.true;
  });
});
