// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs, ok, Platform, Stage, v3 } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import fs from "fs-extra";
import { FxCore } from "../../src";
import {
  CoreQuestionNames,
  ScratchOptionNoVSC,
  ScratchOptionYesVSC,
} from "../../src/core/question";
import { BotOptionItem, TabOptionItem, TabSPFxItem } from "../../src/component/constants";
import { deleteFolder, MockTools, randomAppName } from "./utils";
import { SPFXQuestionNames } from "../../src/component/generator/spfx/utils/questions";
import { setTools } from "../../src/core/globalVars";
import { environmentManager } from "../../src/core/environment";
import { Generator } from "../../src/component/generator/generator";

describe("Core basic APIs for v3", () => {
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  let appName = randomAppName();
  let projectPath = path.resolve(os.tmpdir(), appName);
  beforeEach(() => {
    sandbox.restore();
    setTools(tools);
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sandbox.stub(Generator, "generateSample").resolves(ok(undefined));
    sandbox.stub(environmentManager, "listRemoteEnvConfigs").resolves(ok(["dev"]));
    sandbox.stub(environmentManager, "listAllEnvConfigs").resolves(ok(["dev", "local"]));
  });

  afterEach(() => {
    sandbox.restore();
    deleteFolder(projectPath);
  });
  it("create from new (VSC, Tab)", async () => {
    appName = randomAppName();
    const inputs: Inputs = {
      platform: Platform.VSCode,
      [CoreQuestionNames.AppName]: appName,
      [CoreQuestionNames.Folder]: os.tmpdir(),
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC().id,
      stage: Stage.create,
      [CoreQuestionNames.Capabilities]: [TabOptionItem().id],
      [CoreQuestionNames.ProgrammingLanguage]: "javascript",
    };
    const core = new FxCore(tools);
    const res = await core.createProject(inputs);
    assert.isTrue(res.isOk());
    projectPath = inputs.projectPath!;
  });
  it("create from new (VSC, Tab+Bot)", async () => {
    appName = randomAppName();
    const inputs: Inputs = {
      platform: Platform.VSCode,
      [CoreQuestionNames.AppName]: appName,
      [CoreQuestionNames.Folder]: os.tmpdir(),
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC().id,
      stage: Stage.create,
      [CoreQuestionNames.Capabilities]: [TabOptionItem().id, BotOptionItem().id],
      [CoreQuestionNames.ProgrammingLanguage]: "javascript",
    };
    const core = new FxCore(tools);
    const res = await core.createProject(inputs);
    assert.isTrue(res.isOk());
  });
  it("create from new (VS, Tab+Bot)", async () => {
    appName = randomAppName();
    const inputs: Inputs = {
      platform: Platform.VS,
      [CoreQuestionNames.AppName]: appName,
      [CoreQuestionNames.Folder]: os.tmpdir(),
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC().id,
      projectPath: projectPath,
      stage: Stage.create,
      [CoreQuestionNames.Capabilities]: [TabOptionItem().id, BotOptionItem().id],
      [CoreQuestionNames.ProgrammingLanguage]: "javascript",
    };
    const core = new FxCore(tools);
    const res = await core.createProject(inputs);
    assert.isTrue(res.isOk());
    projectPath = inputs.projectPath!;
  });
  it("create from new (VSC, SPFx)", async () => {
    appName = randomAppName();
    const inputs: Inputs = {
      platform: Platform.VSCode,
      [CoreQuestionNames.AppName]: appName,
      [CoreQuestionNames.Folder]: os.tmpdir(),
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC().id,
      stage: Stage.create,
      [CoreQuestionNames.Capabilities]: [TabSPFxItem().id],
      [CoreQuestionNames.ProgrammingLanguage]: "typescript",
      [SPFXQuestionNames.framework_type]: "react",
      [SPFXQuestionNames.webpart_name]: "helloworld",
      [SPFXQuestionNames.webpart_desp]: "helloworld",
    };
    const core = new FxCore(tools);
    const res = await core.createProject(inputs);
    assert.isTrue(res.isOk());
    projectPath = inputs.projectPath!;
  });

  it("Import existing SPFx solution (VSC, SPFx)", async () => {
    appName = randomAppName();
    const inputs: Inputs = {
      platform: Platform.VSCode,
      [CoreQuestionNames.Folder]: os.tmpdir(),
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC().id,
      stage: Stage.create,
      [CoreQuestionNames.Capabilities]: [TabSPFxItem().id],
      [CoreQuestionNames.ProgrammingLanguage]: "typescript",
      [SPFXQuestionNames.spfx_solution]: "import",
      [SPFXQuestionNames.spfx_import_folder]: "c:\\test",
    };
    sinon
      .stub(fs, "readJson")
      .resolves({ "@microsoft/generator-sharepoint": { solutionName: "fakedSolutionName" } });
    sinon.stub(fs, "pathExists").callsFake((directory: string) => {
      if (directory.includes(".yo-rc.json")) return true;
      else return false;
    });
    const core = new FxCore(tools);
    const res = await core.createProject(inputs);
    assert.isTrue(res.isOk());
  });

  it("create from sample (CLI)", async () => {
    const inputs: Inputs = {
      platform: Platform.CLI,
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionNoVSC().id,
      [CoreQuestionNames.Samples]: "todo-list-SPFx",
      [CoreQuestionNames.Folder]: os.tmpdir(),
      stage: Stage.create,
    };
    const core = new FxCore(tools);
    const res = await core.createProject(inputs);
    assert.isTrue(res.isOk());
    projectPath = inputs.projectPath!;
  });

  it("create from sample (VSC)", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionNoVSC().id,
      [CoreQuestionNames.Samples]: "todo-list-SPFx",
      [CoreQuestionNames.Folder]: os.tmpdir(),
      stage: Stage.create,
    };
    const core = new FxCore(tools);
    const res = await core.createProject(inputs);
    assert.isTrue(res.isOk());
    projectPath = inputs.projectPath!;
  });
});
