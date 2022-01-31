// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks, NextFunction } from "@feathersjs/hooks/lib";
import {
  EmptyOptionError,
  err,
  Func,
  FunctionRouter,
  FxError,
  Inputs,
  InputTextConfig,
  Json,
  ok,
  Platform,
  QTreeNode,
  Result,
  Solution,
  SolutionContext,
  Stage,
  TokenProvider,
  v2,
  v3,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import sinon from "sinon";
import { CoreHookContext, createV2Context, InvalidInputError, setTools, TOOLS } from "../../../src";
import {
  newSolutionContext,
  QuestionModelMW,
  SolutionLoaderMW,
} from "../../../src/core/middleware";
import { SolutionLoaderMW_V3 } from "../../../src/core/middleware/solutionLoaderV3";
import {
  MockProjectSettings,
  mockSolutionV3getQuestionsAPI,
  MockTools,
  randomAppName,
} from "../utils";
import { Container } from "typedi";
import { BuiltInSolutionNames } from "../../../src/plugins/solution/fx-solution/v3/constants";
describe("Middleware - QuestionModelMW", () => {
  const sandbox = sinon.createSandbox();
  afterEach(function () {
    sandbox.restore();
  });
  const inputs: Inputs = { platform: Platform.VSCode };
  const tools = new MockTools();
  setTools(tools);
  const projectSettings = MockProjectSettings("mockappforqm");
  const MockContextLoaderMW = async (ctx: CoreHookContext, next: NextFunction) => {
    ctx.contextV2 = createV2Context(projectSettings);
    ctx.solutionContext = await newSolutionContext(tools, inputs);
    await next();
  };
  const questionName = "mockquestion";
  const node = new QTreeNode({
    type: "text",
    password: true,
    name: questionName,
    title: "test",
  });
  let questionValue = randomAppName();
  class MockCoreForQM {
    tools = tools;
    version = "1";
    async _return(inputs: Inputs): Promise<Result<any, FxError>> {
      if (inputs[questionName] === questionValue) return ok(true);
      return err(InvalidInputError(questionName));
    }
    async createProjectV2(inputs: Inputs): Promise<Result<any, FxError>> {
      return this._return(inputs);
    }
    async createProjectV3(inputs: Inputs): Promise<Result<any, FxError>> {
      return this._return(inputs);
    }
    async provisionResourcesV2(inputs: Inputs): Promise<Result<any, FxError>> {
      return this._return(inputs);
    }
    async provisionResourcesV3(inputs: Inputs): Promise<Result<any, FxError>> {
      return this._return(inputs);
    }
    async deployArtifactsV2(inputs: Inputs): Promise<Result<any, FxError>> {
      return this._return(inputs);
    }
    async deployArtifactsV3(inputs: Inputs): Promise<Result<any, FxError>> {
      return this._return(inputs);
    }
    async localDebugV2(inputs: Inputs): Promise<Result<any, FxError>> {
      return this._return(inputs);
    }
    async localDebugV3(inputs: Inputs): Promise<Result<any, FxError>> {
      return this._return(inputs);
    }
    async publishApplicationV2(inputs: Inputs): Promise<Result<any, FxError>> {
      return this._return(inputs);
    }
    async publishApplicationV3(inputs: Inputs): Promise<Result<any, FxError>> {
      return this._return(inputs);
    }
    async init(inputs: Inputs): Promise<Result<any, FxError>> {
      return this._return(inputs);
    }
    async addFeature(inputs: Inputs): Promise<Result<any, FxError>> {
      return this._return(inputs);
    }
    async executeUserTask(func: Func, inputs: Inputs): Promise<Result<unknown, FxError>> {
      return this._return(inputs);
    }
    async _getQuestionsForCreateProjectV2(
      inputs: Inputs
    ): Promise<Result<QTreeNode | undefined, FxError>> {
      return ok(node);
    }
    async _getQuestionsForCreateProjectV3(
      inputs: Inputs
    ): Promise<Result<QTreeNode | undefined, FxError>> {
      return ok(node);
    }
    async _getQuestions(
      ctx: SolutionContext | v2.Context,
      solution: Solution | v2.SolutionPlugin,
      stage: Stage,
      inputs: Inputs,
      envInfo?: v2.EnvInfoV2
    ): Promise<Result<QTreeNode | undefined, FxError>> {
      return ok(node);
    }

    async _getQuestionsForUserTask(
      ctx: SolutionContext | v2.Context,
      solution: Solution | v2.SolutionPlugin,
      func: FunctionRouter,
      inputs: Inputs,
      envInfo?: v2.EnvInfoV2
    ): Promise<Result<QTreeNode | undefined, FxError>> {
      return ok(node);
    }

    async _getQuestionsForAddFeature(
      inputs: v2.InputsWithProjectPath,
      solution: v3.ISolution,
      context: v2.Context
    ): Promise<Result<QTreeNode | undefined, FxError>> {
      return ok(node);
    }

    async _getQuestionsForProvision(
      inputs: v2.InputsWithProjectPath,
      solution: v3.ISolution,
      context: v2.Context,
      envInfo?: v3.EnvInfoV3
    ): Promise<Result<QTreeNode | undefined, FxError>> {
      return ok(node);
    }
    async _getQuestionsForDeploy(
      inputs: v2.InputsWithProjectPath,
      solution: v3.ISolution,
      context: v2.Context,
      envInfo: v3.EnvInfoV3
    ): Promise<Result<QTreeNode | undefined, FxError>> {
      return ok(node);
    }
    async _getQuestionsForLocalProvision(
      inputs: v2.InputsWithProjectPath,
      solution: v3.ISolution,
      context: v2.Context,
      localSettings?: Json
    ): Promise<Result<QTreeNode | undefined, FxError>> {
      return ok(node);
    }

    async _getQuestionsForPublish(
      inputs: v2.InputsWithProjectPath,
      solution: v3.ISolution,
      context: v2.Context,
      envInfo: v3.EnvInfoV3
    ): Promise<Result<QTreeNode | undefined, FxError>> {
      return ok(node);
    }

    async _getQuestionsForInit(inputs: Inputs): Promise<Result<QTreeNode | undefined, FxError>> {
      return ok(node);
    }
  }

  hooks(MockCoreForQM, {
    createProjectV2: [SolutionLoaderMW, MockContextLoaderMW, QuestionModelMW],
    createProjectV3: [SolutionLoaderMW_V3, MockContextLoaderMW, QuestionModelMW],
    provisionResourcesV2: [SolutionLoaderMW, MockContextLoaderMW, QuestionModelMW],
    provisionResourcesV3: [SolutionLoaderMW_V3, MockContextLoaderMW, QuestionModelMW],
    deployArtifactsV2: [SolutionLoaderMW, MockContextLoaderMW, QuestionModelMW],
    deployArtifactsV3: [SolutionLoaderMW_V3, MockContextLoaderMW, QuestionModelMW],
    localDebugV2: [SolutionLoaderMW, MockContextLoaderMW, QuestionModelMW],
    localDebugV3: [SolutionLoaderMW_V3, MockContextLoaderMW, QuestionModelMW],
    publishApplicationV2: [SolutionLoaderMW, MockContextLoaderMW, QuestionModelMW],
    publishApplicationV3: [SolutionLoaderMW_V3, MockContextLoaderMW, QuestionModelMW],
    executeUserTask: [SolutionLoaderMW, MockContextLoaderMW, QuestionModelMW],
    init: [SolutionLoaderMW_V3, MockContextLoaderMW, QuestionModelMW],
    addFeature: [SolutionLoaderMW_V3, MockContextLoaderMW, QuestionModelMW],
  });

  it("success to run question model for V3 API", async () => {
    sandbox.stub(TOOLS.ui, "inputText").callsFake(async (config: InputTextConfig) => {
      return ok({ type: "success", result: questionValue });
    });
    const my = new MockCoreForQM();

    {
      const inputs: Inputs = { platform: Platform.VSCode };
      const res = await my.init(inputs);
      assert.isTrue(res.isOk() && res.value === true);
    }
    {
      const inputs: Inputs = { platform: Platform.VSCode };
      const res = await my.addFeature(inputs);
      assert.isTrue(res.isOk() && res.value === true);
    }
    {
      const inputs: Inputs = { platform: Platform.VSCode };
      const res = await my.createProjectV2(inputs);
      assert.isTrue(res.isOk() && res.value === true);
    }
    {
      const inputs: Inputs = { platform: Platform.VSCode };
      const res = await my.createProjectV3(inputs);
      assert.isTrue(res.isOk() && res.value === true);
    }
    {
      const inputs: Inputs = { platform: Platform.VSCode };
      const res = await my.provisionResourcesV3(inputs);
      assert.isTrue(res.isOk() && res.value === true);
    }
    {
      const inputs: Inputs = { platform: Platform.VSCode };
      const res = await my.deployArtifactsV3(inputs);
      assert.isTrue(res.isOk() && res.value === true);
    }
    {
      const inputs: Inputs = { platform: Platform.VSCode };
      const res = await my.localDebugV3(inputs);
      assert.isTrue(res.isOk() && res.value === true);
    }
    {
      const inputs: Inputs = { platform: Platform.VSCode };
      const res = await my.publishApplicationV3(inputs);
      assert.isTrue(res.isOk() && res.value === true);
    }
  });
  it("success to run question model for createProject, provisionResources, deployArtifacts, localDebug, publishApplication, executeUserTask", async () => {
    sandbox.stub(TOOLS.ui, "inputText").callsFake(async (config: InputTextConfig) => {
      return ok({ type: "success", result: questionValue });
    });
    const my = new MockCoreForQM();

    {
      const inputs: Inputs = { platform: Platform.VSCode };
      const res = await my.createProjectV2(inputs);
      assert.isTrue(res.isOk() && res.value === true);
    }
    {
      const inputs: Inputs = { platform: Platform.VSCode };
      const res = await my.provisionResourcesV2(inputs);
      assert.isTrue(res.isOk() && res.value === true);
    }
    {
      const inputs: Inputs = { platform: Platform.VSCode };
      const res = await my.deployArtifactsV2(inputs);
      assert.isTrue(res.isOk() && res.value === true);
    }
    {
      const inputs: Inputs = { platform: Platform.VSCode };
      const res = await my.localDebugV2(inputs);
      assert.isTrue(res.isOk() && res.value === true);
    }
    {
      const inputs: Inputs = { platform: Platform.VSCode };
      const res = await my.publishApplicationV2(inputs);
      assert.isTrue(res.isOk() && res.value === true);
    }
    {
      const func: Func = { method: "test", namespace: "" };
      const userTaskRes = await my.executeUserTask(func, inputs);
      assert.isTrue(userTaskRes.isOk() && userTaskRes.value);
    }
  });

  it("get question or traverse question tree error", async () => {
    sandbox.stub(TOOLS.ui, "inputText").callsFake(async (config: InputTextConfig) => {
      return ok({ type: "success", result: questionValue });
    });
    const my = new MockCoreForQM();
    my._getQuestionsForCreateProjectV2 = async function (
      inputs: Inputs
    ): Promise<Result<QTreeNode | undefined, FxError>> {
      return err(InvalidInputError("mock"));
    };
    my._getQuestions = async function (
      ctx: SolutionContext | v2.Context,
      solution: Solution | v2.SolutionPlugin,
      stage: Stage,
      inputs: Inputs,
      envInfo?: v2.EnvInfoV2
    ): Promise<Result<QTreeNode | undefined, FxError>> {
      return err(InvalidInputError("mock"));
    };
    my._getQuestionsForUserTask = async function (
      ctx: SolutionContext | v2.Context,
      solution: Solution | v2.SolutionPlugin,
      func: FunctionRouter,
      inputs: Inputs,
      envInfo?: v2.EnvInfoV2
    ): Promise<Result<QTreeNode | undefined, FxError>> {
      const node = new QTreeNode({
        type: "singleSelect",
        name: questionName,
        title: "",
        staticOptions: [],
      });
      return ok(node);
    };

    let res = await my.createProjectV2(inputs);
    assert(res.isErr() && res.error.name === InvalidInputError("").name);

    delete inputs[questionName];
    questionValue = randomAppName() + "provisionResources";
    res = await my.provisionResourcesV2(inputs);
    assert(res.isErr() && res.error.name === InvalidInputError("").name);

    delete inputs[questionName];
    questionValue = randomAppName() + "deployArtifacts";
    res = await my.deployArtifactsV2(inputs);
    assert(res.isErr() && res.error.name === InvalidInputError("").name);

    delete inputs[questionName];
    questionValue = randomAppName() + "localDebug";
    res = await my.localDebugV2(inputs);
    assert(res.isErr() && res.error.name === InvalidInputError("").name);

    delete inputs[questionName];
    questionValue = randomAppName() + "publishApplication";
    res = await my.publishApplicationV2(inputs);
    assert(res.isErr() && res.error.name === InvalidInputError("").name);

    delete inputs[questionName];
    questionValue = randomAppName() + "executeUserTask";
    const func: Func = { method: "test", namespace: "" };
    const res2 = await my.executeUserTask(func, inputs);
    assert(res2.isErr() && res2.error.name === new EmptyOptionError().name);
  });
  it("Core's getQuestion APIs", async () => {
    const solution = Container.get<v3.ISolution>(BuiltInSolutionNames.azure);
    mockSolutionV3getQuestionsAPI(solution, sandbox);
    assert.isTrue(true);
  });
});
