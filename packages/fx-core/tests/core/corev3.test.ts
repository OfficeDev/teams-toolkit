// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Inputs,
  Platform,
  Stage,
  v2,
  v3,
  ok,
  TokenProvider,
  Json,
  AppStudioTokenProvider,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import Container from "typedi";
import { FxCore, setTools } from "../../src";
import { CoreQuestionNames, ScratchOptionYesVSC } from "../../src/core/question";
import { BotOptionItem, TabOptionItem } from "../../src/plugins/solution/fx-solution/question";
import { BuiltInSolutionNames } from "../../src/plugins/solution/fx-solution/v3/constants";
import {
  deleteFolder,
  MockSolution,
  MockSolutionV2,
  mockSolutionV3getQuestionsAPI,
  MockTools,
  randomAppName,
} from "./utils";

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
    setTools(tools);
    mockedEnvRestore = mockedEnv({ TEAMSFX_APIV3: "true" });
  });

  afterEach(() => {
    mockedEnvRestore();
    sandbox.restore();
    deleteFolder(projectPath);
  });

  it("create from new", async () => {
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
    assert.isTrue(res.isOk() && res.value === os.homedir() + appName);
  });
  it("create from new, provision, deploy, localDebug, publish, getQuestion, getQuestionsForUserTask, getProjectConfig", async () => {});
  it("getQuestions for create", async () => {});
  it("getQuestions, getQuestionsForUserTask for static question", async () => {});
  it("crypto: encrypt, decrypt secrets", async () => {});
});
