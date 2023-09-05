// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";

import fs from "fs-extra";
import sinon from "sinon";

import * as apis from "@microsoft/teamsfx-api";
import * as core from "@microsoft/teamsfx-core";

import activate from "../../src/activate";
import AzureAccountManager from "../../src/commonlib/azureLogin";
import { UserSettings } from "../../src/userSetttings";
import {
  flattenNodes,
  getColorizedString,
  getSettingsVersion,
  getSingleOptionString,
  getSystemInputs,
  getTemplates,
  getVersion,
  isWorkspaceSupported,
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

  describe("getSingleOptionString", () => {
    const sandbox = sinon.createSandbox();

    before(() => {
      sandbox
        .stub(core, "getSingleOption")
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
    it("singleSelect and no default value", async () => {
      const question: apis.Question = {
        type: "singleSelect",
        name: "question",
        title: "toYargsOptions",
        returnObject: true,
        staticOptions: staticOptions1,
      };
      const answer = await toYargsOptions(question);
      expect(answer.choices).deep.equals(["a", "b", "c"]);
      expect(answer.array).to.be.false;
      expect("default" in answer).to.be.false;
    });

    it("singleSelect and default value", async () => {
      const question: apis.Question = {
        type: "singleSelect",
        name: "question",
        title: "toYargsOptions",
        returnObject: true,
        staticOptions: staticOptions1,
        default: "A",
      };
      const answer = await toYargsOptions(question);
      expect(answer.choices).deep.equals(["a", "b", "c"]);
      expect(answer.array).to.be.false;
      expect(answer.default).equals("a");
    });

    it("multiSelect and default value", async () => {
      const question: apis.Question = {
        type: "multiSelect",
        name: "question",
        title: "toYargsOptions",
        returnObject: true,
        staticOptions: staticOptions2,
        default: ["AA"],
      };
      const answer = await toYargsOptions(question);
      expect(answer.choices).deep.equals(["aa", "bb", "cc"]);
      expect(answer.array).to.be.true;
      expect(answer.default).deep.equals(["aa"]);
    });

    it("dynamic title and default value", async () => {
      const question: apis.Question = {
        type: "multiSelect",
        name: "question",
        title: (inputs: apis.Inputs) => "dynamic title",
        returnObject: true,
        staticOptions: staticOptions2,
        default: (inputs: apis.Inputs) => ["AA"],
      };
      const answer = await toYargsOptions(question);
      expect(answer.choices).deep.equals(["aa", "bb", "cc"]);
      expect(answer.array).to.be.true;
      expect(answer.default).deep.equals(["aa"]);
      expect(answer.description).equals("dynamic title");
    });
  });

  it("toLocaleLowerCase", () => {
    expect(toLocaleLowerCase("MiNe")).equals("mine");
    expect(toLocaleLowerCase(["ItS", "HiS"])).deep.equals(["its", "his"]);
    expect(toLocaleLowerCase(undefined)).equals(undefined);
  });

  it("flattenNodes", () => {
    const root: apis.IQTreeNode = {
      data: {
        type: "group",
      },
      children: [
        {
          data: { type: "folder", name: "a", title: "aa" },
        },
        {
          data: { type: "folder", name: "b", title: "bb" },
        },
      ],
    };
    const answers = flattenNodes(root);
    expect(answers.map((a) => a.data)).deep.equals([
      { type: "group" },
      { type: "folder", name: "a", title: "aa" },
      { type: "folder", name: "b", title: "bb" },
    ]);
    expect(root.children).not.equals(undefined);
  });

  describe("getSettingsVersion", async () => {
    const sandbox = sinon.createSandbox();

    before(() => {
      sandbox.stub(fs, "existsSync").callsFake((path: fs.PathLike) => {
        return path.toString().includes("real");
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

    it("Real Path in V3", () => {
      const result = getSettingsVersion("real");
      expect(result).deep.equals("1.0.0");
    });

    it("Real Path but cannot read", () => {
      const result = getSettingsVersion("realbuterror");
      expect(result).equals(undefined);
    });

    it("Fake Path", () => {
      const result = getSettingsVersion("fake");
      expect(result).equals(undefined);
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

    it("Real Path in V3", async () => {
      const result = isWorkspaceSupported("real");
      expect(result).equals(true);
    });

    it("Fake Path", async () => {
      const result = isWorkspaceSupported("fake");
      expect(result).equals(false);
    });
  });

  it("getSystemInputs", async () => {
    const inputs = getSystemInputs("real");
    expect(inputs.platform).equals(apis.Platform.CLI);
    expect(inputs.projectPath).equals("real");
  });

  it("getColorizedString", async () => {
    /// TODO: mock chalk and test
    const arr = Object.keys(apis.Colors)
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

  describe("getTemplates", async () => {
    const sandbox = sinon.createSandbox();

    before(() => {
      sandbox.stub(fs, "readJsonSync").returns({ version: "2.0.0" });
    });

    after(() => {
      sandbox.restore();
    });

    it("filters samples have maximum cli verion", async () => {
      sandbox.stub(core.sampleProvider, "fetchSampleConfig").callsFake(async () => {
        core.sampleProvider["samplesConfig"] = {
          samples: [
            {
              id: "test1",
              onboardDate: "2021-05-06",
              title: "test1",
              shortDescription: "test1",
              fullDescription: "test1",
              types: ["Tab"],
              tags: [],
              time: "1hr to run",
              configuration: "",
              gifPath: "",
              suggested: false,
            },
            {
              id: "test1",
              onboardDate: "2021-05-06",
              title: "test1",
              shortDescription: "test1",
              fullDescription: "test1",
              types: ["Tab"],
              tags: [],
              time: "1hr to run",
              configuration: "",
              gifPath: "",
              suggested: false,
              maximumCliVersion: "1.0.0",
            },
          ],
        };
      });
      const templates = await getTemplates();
      expect(templates.length).equals(1);
    });

    it("filters samples have minimum cli verion", async () => {
      sandbox.stub(core.sampleProvider, "fetchSampleConfig").callsFake(async () => {
        core.sampleProvider["samplesConfig"] = {
          samples: [
            {
              id: "test1",
              onboardDate: "2021-05-06",
              title: "test1",
              shortDescription: "test1",
              fullDescription: "test1",
              types: ["Tab"],
              tags: [],
              time: "1hr to run",
              configuration: "",
              gifPath: "",
              suggested: false,
            },
            {
              id: "test1",
              onboardDate: "2021-05-06",
              title: "test1",
              shortDescription: "test1",
              fullDescription: "test1",
              types: ["Tab"],
              tags: [],
              time: "1hr to run",
              configuration: "",
              gifPath: "",
              suggested: false,
              minimumCliVersion: "1.0.0",
            },
          ],
        };
      });
      const templates = await getTemplates();
      expect(templates.length).equals(1);
    });
  });
});

describe("UserSettings", async () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  it("getConfigSync WriteFileError", async () => {
    sandbox.stub(fs, "pathExistsSync").throws(new Error("error"));
    const res = UserSettings.getConfigSync();
    expect(res.isErr()).equals(true);
    if (res.isErr()) {
      expect(res.error instanceof core.WriteFileError).equals(true);
    }
  });
  it("setConfigSync WriteFileError", async () => {
    sandbox.stub(UserSettings, "getConfigSync").returns(apis.ok({}));
    sandbox.stub(UserSettings, "getUserSettingsFile").returns("");
    sandbox.stub(fs, "writeJSONSync").throws(new Error("error"));
    const res = UserSettings.setConfigSync({});
    expect(res.isErr()).equals(true);
    if (res.isErr()) {
      expect(res.error instanceof core.WriteFileError).equals(true);
    }
  });
});

describe("activate", async () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  it("UnhandledError", async () => {
    sandbox.stub(AzureAccountManager, "setRootPath").throws(new Error("error"));
    const res = await activate(".", false);
    expect(res.isErr()).equals(true);
    if (res.isErr()) {
      expect(res.error instanceof core.UnhandledError).equals(true);
    }
  });
});
