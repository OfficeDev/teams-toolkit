// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs, ok, Platform, Stage, v3 } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import { Container } from "typedi";
import { environmentManager, FxCore, setTools } from "../../src";
import {
  CoreQuestionNames,
  ScratchOptionNoVSC,
  ScratchOptionYesVSC,
} from "../../src/core/question";
import {
  BotOptionItem,
  TabOptionItem,
  TabSPFxItem,
} from "../../src/plugins/solution/fx-solution/question";
import { BuiltInSolutionNames } from "../../src/plugins/solution/fx-solution/v3/constants";
import { deleteFolder, MockTools, randomAppName } from "./utils";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import fs from "fs-extra";
import { SPFXQuestionNames } from "../../src/plugins/resource/spfx/utils/questions";
describe("Core basic APIs for v3", () => {
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  let appName = randomAppName();
  let projectPath = path.resolve(os.tmpdir(), appName);
  let mockedEnvRestore: RestoreFn;
  beforeEach(() => {
    sandbox.restore();
    setTools(tools);
    mockedEnvRestore = mockedEnv({ TEAMSFX_APIV3: "true" });
    sandbox
      .stub<any, any>(axios, "get")
      .callsFake(async (url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<any>> => {
        const buffer = fs.readFileSync("./tests/core/samples_v2.zip");
        return {
          data: buffer,
          status: 200,
          statusText: "",
          headers: {},
          config: config!,
          request: {},
        };
      });
    sandbox.stub(environmentManager, "listRemoteEnvConfigs").resolves(ok(["dev"]));
    sandbox.stub(environmentManager, "listAllEnvConfigs").resolves(ok(["dev", "local"]));
  });

  afterEach(() => {
    mockedEnvRestore();
    sandbox.restore();
    deleteFolder(projectPath);
  });
  it("create + provision (VSC, Tab)", async () => {
    appName = randomAppName();
    const inputs: Inputs = {
      platform: Platform.VSCode,
      [CoreQuestionNames.AppName]: appName,
      [CoreQuestionNames.Folder]: os.tmpdir(),
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
      stage: Stage.create,
      [CoreQuestionNames.Capabilities]: [TabOptionItem.id],
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
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
      stage: Stage.create,
      [CoreQuestionNames.Capabilities]: [TabOptionItem.id, BotOptionItem.id],
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
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
      projectPath: projectPath,
      stage: Stage.create,
      [CoreQuestionNames.Capabilities]: [TabOptionItem.id, BotOptionItem.id],
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
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
      stage: Stage.create,
      [CoreQuestionNames.Capabilities]: [TabSPFxItem.id],
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

  it("create from sample (VSC)", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionNoVSC.id,
      [CoreQuestionNames.Samples]: "hello-world-tab",
      [CoreQuestionNames.Folder]: os.tmpdir(),
      stage: Stage.create,
    };
    const core = new FxCore(tools);
    const res = await core.createProject(inputs);
    assert.isTrue(res.isOk());
    projectPath = inputs.projectPath!;
  });
});
