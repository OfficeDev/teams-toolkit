// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs, OptionItem, Platform, Stage, v3 } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import { Container } from "typedi";
import { FxCore, setTools } from "../../src";
import {
  CoreQuestionNames,
  SampleSelect,
  ScratchOptionNoVSC,
  ScratchOptionYesVSC,
} from "../../src/core/question";
import {
  BotOptionItem,
  TabOptionItem,
  TabSPFxItem,
} from "../../src/plugins/solution/fx-solution/question";
import { BuiltInSolutionNames } from "../../src/plugins/solution/fx-solution/v3/constants";
import { deleteFolder, mockSolutionV3getQuestionsAPI, MockTools, randomAppName } from "./utils";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import fs from "fs-extra";
describe("Core basic APIs for v3", () => {
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  let appName = randomAppName();
  let projectPath = path.resolve(os.tmpdir(), appName);
  let mockedEnvRestore: RestoreFn;
  beforeEach(() => {
    sandbox.restore();
    const solutionAzure = Container.get<v3.ISolution>(BuiltInSolutionNames.azure);
    mockSolutionV3getQuestionsAPI(solutionAzure, sandbox);
    const solutionSPFx = Container.get<v3.ISolution>(BuiltInSolutionNames.spfx);
    mockSolutionV3getQuestionsAPI(solutionSPFx, sandbox);
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
  });

  afterEach(() => {
    mockedEnvRestore();
    sandbox.restore();
    deleteFolder(projectPath);
  });

  it("create from new (VSC, Tab+Bot)", async () => {
    appName = randomAppName();
    projectPath = path.resolve(os.tmpdir(), appName);
    const inputs: Inputs = {
      platform: Platform.VSCode,
      [CoreQuestionNames.AppName]: appName,
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
      projectPath: projectPath,
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
    projectPath = path.resolve(os.tmpdir(), appName);
    const inputs: Inputs = {
      platform: Platform.VS,
      [CoreQuestionNames.AppName]: appName,
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
      projectPath: projectPath,
      stage: Stage.create,
      [CoreQuestionNames.Capabilities]: [TabOptionItem.id, BotOptionItem.id],
      [CoreQuestionNames.ProgrammingLanguage]: "javascript",
    };
    const core = new FxCore(tools);
    const res = await core.createProject(inputs);
    assert.isTrue(res.isOk());
  });
  it("create from new (VSC, SPFx)", async () => {
    appName = randomAppName();
    projectPath = path.resolve(os.tmpdir(), appName);
    const inputs: Inputs = {
      platform: Platform.VSCode,
      [CoreQuestionNames.AppName]: appName,
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
      projectPath: projectPath,
      stage: Stage.create,
      [CoreQuestionNames.Capabilities]: [TabSPFxItem.id],
      [CoreQuestionNames.ProgrammingLanguage]: "typescript",
    };
    const core = new FxCore(tools);
    const res = await core.createProject(inputs);
    assert.isTrue(res.isOk());
  });

  it("create from sample (VSC)", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionNoVSC.id,
      [CoreQuestionNames.Samples]: "hello-world-tab",
      stage: Stage.create,
    };
    const core = new FxCore(tools);
    const res = await core.createProject(inputs);
    assert.isTrue(res.isOk());
    projectPath = inputs.projectPath!;
  });
});
