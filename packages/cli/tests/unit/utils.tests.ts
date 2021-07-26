// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";
import fs from "fs-extra";
import * as apis from "@microsoft/teamsfx-api";
import { Colors, Platform, QTreeNode, UserError } from "@microsoft/teamsfx-api";
import sinon from "sinon";

import {
  argsToInputs,
  flattenNodes,
  getChoicesFromQTNodeQuestion,
  getColorizedString,
  getConfigPath,
  getLocalTeamsAppId,
  getProjectId,
  getSingleOptionString,
  getSystemInputs,
  getTeamsAppId,
  getVersion,
  isWorkspaceSupported,
  readEnvJsonFile,
  readEnvJsonFileSync,
  readProjectSecrets,
  readSettingsFileSync,
  setSubscriptionId,
  sleep,
  toYargsOptions,
  writeSecretToFile,
} from "../../src/utils";
import { expect } from "./utils";
import AzureAccountManager from "../../src/commonlib/azureLogin";

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
      const result = await readEnvJsonFile("real");
      expect(result.isOk() ? result.value : result.error).deep.equals({});
    });

    it("Real Path but cannot read", async () => {
      const result = await readEnvJsonFile("realbuterror");
      expect(result.isOk() ? result.value : result.error.name).equals("ReadFileError");
    });

    it("Fake Path", async () => {
      const result = await readEnvJsonFile("fake");
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
      const result = readEnvJsonFileSync("real");
      expect(result.isOk() ? result.value : result.error).deep.equals({});
    });

    it("Real Path but cannot read", () => {
      const result = readEnvJsonFileSync("realbuterror");
      expect(result.isOk() ? result.value : result.error.name).equals("ReadFileError");
    });

    it("Fake Path", () => {
      const result = readEnvJsonFileSync("fake");
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
    });

    after(() => {
      sandbox.restore();
    });

    it("Real Path", () => {
      const result = readSettingsFileSync("real");
      expect(result.isOk() ? result.value : result.error).deep.equals({});
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
      const result = await readProjectSecrets("real");
      expect(result.isOk() ? result.value : result.error).deep.equals({});
    });

    it("Real Path but cannot read", async () => {
      const result = await readProjectSecrets("realbuterror");
      expect(result.isOk() ? result.value : result.error.name).equals("ReadFileError");
    });

    it("Fake Path", async () => {
      const result = await readProjectSecrets("fake");
      expect(result.isOk() ? result.value : result.error.name).equals("ConfigNotFound");
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

    it("Fake Path", async () => {
      const result = isWorkspaceSupported("fake");
      expect(result).equals(false);
    });
  });

  describe("getTeamsAppId", async () => {
    const sandbox = sinon.createSandbox();

    before(() => {
      sandbox.stub(fs, "existsSync").callsFake((path: fs.PathLike) => {
        return path.toString().includes("real");
      });
      sandbox.stub(fs, "readJsonSync").returns({
        solution: {
          remoteTeamsAppId: "real",
        },
      });
    });

    after(() => {
      sandbox.restore();
    });

    it("No Root Folder", async () => {
      const result = getTeamsAppId(undefined);
      expect(result).equals(undefined);
    });

    it("Real Path", async () => {
      const result = getTeamsAppId("real");
      expect(result).equals("real");
    });

    it("Fake Path", async () => {
      const result = getTeamsAppId("fake");
      expect(result).equals(undefined);
    });
  });

  describe("getLocalTeamsAppId", async () => {
    const sandbox = sinon.createSandbox();

    before(() => {
      sandbox.stub(fs, "existsSync").callsFake((path: fs.PathLike) => {
        return path.toString().includes("real");
      });
      sandbox.stub(fs, "readJsonSync").returns({
        solution: {
          localDebugTeamsAppId: "real",
        },
      });
    });

    after(() => {
      sandbox.restore();
    });

    it("No Root Folder", async () => {
      const result = getLocalTeamsAppId(undefined);
      expect(result).equals(undefined);
    });

    it("Real Path", async () => {
      const result = getLocalTeamsAppId("real");
      expect(result).equals("real");
    });

    it("Fake Path", async () => {
      const result = getLocalTeamsAppId("fake");
      expect(result).equals(undefined);
    });
  });

  describe("getProjectId", async () => {
    const sandbox = sinon.createSandbox();

    before(() => {
      sandbox.stub(fs, "existsSync").callsFake((path: fs.PathLike) => {
        return path.toString().includes("real");
      });
      sandbox.stub(fs, "readJsonSync").returns({
        projectId: "real",
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
});
