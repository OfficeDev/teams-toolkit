import * as chai from "chai";
import sinon from "ts-sinon";
import { Explainer } from "../../../../src/officeChat/common/skills/codeExplainer";
import { Spec } from "../../../../src/officeChat/common/skills/spec";
import { CancellationToken, ChatResponseStream, LanguageModelChatUserMessage } from "vscode";
import * as utils from "../../../../src/chat/utils";
import { ExecutionResultEnum } from "../../../../src/officeChat/common/skills/executionResultEnum";
import { projectCreator } from "../../../../src/officeChat/common/skills/projectCreator";
import path = require("path");
import * as helper from "../../../../src/chat/commands/create/helper";
import * as fs from "fs-extra";
import * as vscode from "vscode";

describe("projectCreator", () => {
  let invokeParametersInit: () => any;
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    invokeParametersInit = function () {
      const spec = new Spec("some user input");
      spec.taskSummary = "some task summary";
      spec.sections = ["section1", "section2"];
      spec.inspires = ["inspire1", "inspire2"];
      spec.resources = ["resource1", "resource2"];
      spec.appendix = {
        host: "some host",
        codeSnippet: "some code",
        codeExplanation: "some explanation",
        codeTaskBreakdown: ["task1", "task2"],
        isCustomFunction: false,
        telemetryData: {
          properties: { property1: "value1", property2: "value2" },
          measurements: { measurement1: 1, measurement2: 2 },
        },
        complexity: 0,
      };

      const model: LanguageModelChatUserMessage = {
        content: "",
        name: undefined,
      };

      const fakeResponse: ChatResponseStream = {
        markdown: sandbox.stub(),
        anchor: sandbox.stub(),
        button: sandbox.stub(),
        filetree: sandbox.stub(),
        progress: sandbox.stub(),
        reference: sandbox.stub(),
        push: sandbox.stub(),
      };

      const fakeToken: CancellationToken = {
        isCancellationRequested: false,
        onCancellationRequested: sandbox.stub(),
      };

      return { spec, model, fakeResponse, fakeToken };
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("constructor", () => {
    const project_creator = new projectCreator();

    chai.assert.isNotNull(project_creator);
    chai.assert.equal(project_creator.name, "Project Creator");
    chai.assert.equal(project_creator.capability, "Create a new project template");
  });

  it("canInvoke returns true", () => {
    const project_creator = new projectCreator();
    const spec = new Spec("Some user input");
    spec.taskSummary = "Some task summary";
    spec.sections = ["section1", "section2"];
    spec.inspires = ["inspire1", "inspire2"];
    spec.resources = ["resource1", "resource2"];
    spec.appendix = {
      host: "Some host",
      codeSnippet: "Some code snippet",
      codeExplanation: "Some code explanation",
      codeTaskBreakdown: ["task1", "task2"],
      isCustomFunction: true,
      telemetryData: {
        properties: {
          property1: "value1",
          property2: "value2",
        },
        measurements: {
          measurement1: 1,
          measurement2: 2,
        },
      },
      complexity: 3,
    };

    const result = project_creator.canInvoke(spec);
    chai.assert.isTrue(result);
  });

  it("Invoke - mergeCFCode - no write file error", async () => {
    const { spec, model, fakeResponse, fakeToken } = invokeParametersInit();
    const project_creator = new projectCreator();
    spec.appendix.isCustomFunction = true;

    //buildProjectFromSpec
    sandbox.stub(vscode.commands, "executeCommand");

    /* mergeCFCode */
    ///store original fs
    const originalFs = Reflect.get(vscode.workspace, "fs");
    //fakeWorkspace
    const readFileStub = () => {
      return new Uint8Array();
    };
    const writeFileStub = () => {};
    const fakeFs = {
      readFile: readFileStub,
      writeFile: writeFileStub,
    };

    Reflect.set(vscode.workspace, "fs", fakeFs);

    /* traverseFiles */
    sandbox.stub(path, "relative").returns("relative path");
    sandbox.stub(helper, "fileTreeAdd");

    const lstatSyncStub = sandbox.stub(fs, "lstatSync");

    const fakeDirentfiles0 = ["dir1"];
    ///store original readdirSync
    const originalReaddirSync = Reflect.get(fs, "readdirSync");
    //fake readdirSync
    Reflect.set(fs, "readdirSync", (dir: string) => {
      return fakeDirentfiles0;
    });

    const fakeStats0 = {
      isDirectory: () => true,
    } as fs.Stats;
    lstatSyncStub.onCall(0).returns(fakeStats0);

    const fakeStats1 = {
      isDirectory: () => false,
    } as fs.Stats;
    lstatSyncStub.onCall(1).returns(fakeStats1);

    const result = await project_creator.invoke(model, fakeResponse, fakeToken, spec);

    chai.expect(result.result).to.equal(ExecutionResultEnum.Success);
    chai.expect(spec).to.equal(spec);

    //restore reflect functions
    Reflect.set(vscode.workspace, "fs", originalFs);
    Reflect.set(fs, "readdirSync", originalReaddirSync);
  });

  it("Invoke - mergeCFCode - write file error", async () => {
    const { spec, model, fakeResponse, fakeToken } = invokeParametersInit();
    const project_creator = new projectCreator();
    spec.appendix.isCustomFunction = true;

    //buildProjectFromSpec
    sandbox.stub(vscode.commands, "executeCommand");

    /* mergeCFCode */
    ///store original fs
    const originalFs = Reflect.get(vscode.workspace, "fs");
    //fakeWorkspace
    const readFileStub = () => {
      return new Uint8Array();
    };
    const writeFileStub = () => {
      throw new Error("write file error");
    };
    const fakeFs = {
      readFile: readFileStub,
      writeFile: writeFileStub,
    };

    Reflect.set(vscode.workspace, "fs", fakeFs);

    /* traverseFiles */
    sandbox.stub(path, "relative").returns("relative path");
    sandbox.stub(helper, "fileTreeAdd");

    const lstatSyncStub = sandbox.stub(fs, "lstatSync");

    const fakeDirentfiles0 = ["dir1"];
    ///store original readdirSync
    const originalReaddirSync = Reflect.get(fs, "readdirSync");
    //fake readdirSync
    Reflect.set(fs, "readdirSync", (dir: string) => {
      return fakeDirentfiles0;
    });

    const fakeStats0 = {
      isDirectory: () => true,
    } as fs.Stats;
    lstatSyncStub.onCall(0).returns(fakeStats0);

    const fakeStats1 = {
      isDirectory: () => false,
    } as fs.Stats;
    lstatSyncStub.onCall(1).returns(fakeStats1);

    const result = await project_creator.invoke(model, fakeResponse, fakeToken, spec);

    chai.expect(result.result).to.equal(ExecutionResultEnum.Success);
    chai.expect(spec).to.equal(spec);

    //restore reflect functions
    Reflect.set(vscode.workspace, "fs", originalFs);
    Reflect.set(fs, "readdirSync", originalReaddirSync);
  });

  it("Invoke - mergeTaskpaneCode - no write file error", async () => {
    const { spec, model, fakeResponse, fakeToken } = invokeParametersInit();
    const project_creator = new projectCreator();
    spec.appendix.isCustomFunction = false;

    //buildProjectFromSpec
    sandbox.stub(vscode.commands, "executeCommand");

    /* mergeTaskpaneCode */
    ///store original fs
    const originalFs = Reflect.get(vscode.workspace, "fs");
    //fakeWorkspace
    const readFileStub = () => {
      return new Uint8Array();
    };
    const writeFileStub = () => {};
    const fakeFs = {
      readFile: readFileStub,
      writeFile: writeFileStub,
    };

    Reflect.set(vscode.workspace, "fs", fakeFs);

    /* traverseFiles */
    sandbox.stub(path, "relative").returns("relative path");
    sandbox.stub(helper, "fileTreeAdd");

    const lstatSyncStub = sandbox.stub(fs, "lstatSync");

    const fakeDirentfiles0 = ["dir1"];
    ///store original readdirSync
    const originalReaddirSync = Reflect.get(fs, "readdirSync");
    //fake readdirSync
    Reflect.set(fs, "readdirSync", (dir: string) => {
      return fakeDirentfiles0;
    });

    const fakeStats0 = {
      isDirectory: () => true,
    } as fs.Stats;
    lstatSyncStub.onCall(0).returns(fakeStats0);

    const fakeStats1 = {
      isDirectory: () => false,
    } as fs.Stats;
    lstatSyncStub.onCall(1).returns(fakeStats1);

    const result = await project_creator.invoke(model, fakeResponse, fakeToken, spec);

    chai.expect(result.result).to.equal(ExecutionResultEnum.Success);
    chai.expect(spec).to.equal(spec);

    //restore reflect functions
    Reflect.set(vscode.workspace, "fs", originalFs);
    Reflect.set(fs, "readdirSync", originalReaddirSync);
  });

  it("Invoke - mergeTaskpaneCode - write file error", async () => {
    const { spec, model, fakeResponse, fakeToken } = invokeParametersInit();
    const project_creator = new projectCreator();
    spec.appendix.isCustomFunction = false;

    //buildProjectFromSpec
    sandbox.stub(vscode.commands, "executeCommand");

    /* mergeTaskpaneCode */
    ///store original fs
    const originalFs = Reflect.get(vscode.workspace, "fs");
    //fakeWorkspace
    const readFileStub = () => {
      return new Uint8Array();
    };
    const writeFileStub = () => {
      throw new Error("write file error");
    };
    const fakeFs = {
      readFile: readFileStub,
      writeFile: writeFileStub,
    };

    Reflect.set(vscode.workspace, "fs", fakeFs);

    /* traverseFiles */
    sandbox.stub(path, "relative").returns("relative path");
    sandbox.stub(helper, "fileTreeAdd");

    const lstatSyncStub = sandbox.stub(fs, "lstatSync");

    const fakeDirentfiles0 = ["dir1"];
    ///store original readdirSync
    const originalReaddirSync = Reflect.get(fs, "readdirSync");
    //fake readdirSync
    Reflect.set(fs, "readdirSync", (dir: string) => {
      return fakeDirentfiles0;
    });

    const fakeStats0 = {
      isDirectory: () => true,
    } as fs.Stats;
    lstatSyncStub.onCall(0).returns(fakeStats0);

    const fakeStats1 = {
      isDirectory: () => false,
    } as fs.Stats;
    lstatSyncStub.onCall(1).returns(fakeStats1);

    const result = await project_creator.invoke(model, fakeResponse, fakeToken, spec);

    chai.expect(result.result).to.equal(ExecutionResultEnum.Success);
    chai.expect(spec).to.equal(spec);

    //restore reflect functions
    Reflect.set(vscode.workspace, "fs", originalFs);
    Reflect.set(fs, "readdirSync", originalReaddirSync);
  });
});
