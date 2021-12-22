// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks, NextFunction } from "@feathersjs/hooks/lib";
import {
  AppStudioTokenProvider,
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
import {
  CoreHookContext,
  createV2Context,
  InvalidInputError,
  isV2,
  setTools,
  TOOLS,
} from "../../../src";
import {
  getQuestionsForInit,
  newSolutionContext,
  QuestionModelMW,
  SolutionLoaderMW,
} from "../../../src/core/middleware";
import { SolutionLoaderMW_V3 } from "../../../src/core/middleware/solutionLoaderV3";
import { MockProjectSettings, MockTools, randomAppName } from "../utils";
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
    async addModule(inputs: Inputs): Promise<Result<any, FxError>> {
      return this._return(inputs);
    }
    async addResource(inputs: Inputs): Promise<Result<any, FxError>> {
      return this._return(inputs);
    }
    async scaffold(inputs: Inputs): Promise<Result<any, FxError>> {
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

    async _getQuestionsForAddModule(
      inputs: v2.InputsWithProjectPath,
      solution: v3.ISolution,
      context: v2.Context
    ): Promise<Result<QTreeNode | undefined, FxError>> {
      return ok(node);
    }

    async _getQuestionsForAddResource(
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
    async _getQuestionsForScaffold(
      inputs: v2.InputsWithProjectPath,
      solution: v3.ISolution,
      context: v2.Context,
      envInfo: v3.EnvInfoV3
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
    addModule: [SolutionLoaderMW_V3, MockContextLoaderMW, QuestionModelMW],
    scaffold: [SolutionLoaderMW_V3, MockContextLoaderMW, QuestionModelMW],
    addResource: [SolutionLoaderMW_V3, MockContextLoaderMW, QuestionModelMW],
  });
  const EnvParams = [{ TEAMSFX_APIV2: "false" }, { TEAMSFX_APIV2: "true" }];
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
      const res = await my.addModule(inputs);
      assert.isTrue(res.isOk() && res.value === true);
    }
    {
      const inputs: Inputs = { platform: Platform.VSCode };
      const res = await my.scaffold(inputs);
      assert.isTrue(res.isOk() && res.value === true);
    }
    {
      const inputs: Inputs = { platform: Platform.VSCode };
      const res = await my.addResource(inputs);
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
  for (const param of EnvParams) {
    describe(`API V2:${param.TEAMSFX_APIV2}`, () => {
      let mockedEnvRestore: RestoreFn;
      beforeEach(() => {
        mockedEnvRestore = mockedEnv(param);
      });

      afterEach(() => {
        mockedEnvRestore();
        sandbox.restore();
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
    });
  }
  it("Core's getQuestion APIs", async () => {
    const solution = Container.get<v3.ISolution>(BuiltInSolutionNames.azure);
    sandbox
      .stub(solution, "getQuestionsForScaffold")
      .callsFake(async (ctx: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok(undefined);
      });
    sandbox
      .stub(solution, "getQuestionsForAddResource")
      .callsFake(async (ctx: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok(undefined);
      });
    sandbox
      .stub(solution, "getQuestionsForAddModule")
      .callsFake(async (ctx: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok(undefined);
      });
    sandbox
      .stub(solution, "getQuestionsForProvision")
      .callsFake(
        async (
          ctx: v2.Context,
          inputs: v2.InputsWithProjectPath,
          tokenProvider: TokenProvider,
          envInfo?: v2.DeepReadonly<v3.EnvInfoV3>
        ) => {
          return ok(undefined);
        }
      );
    sandbox
      .stub(solution, "getQuestionsForLocalProvision")
      .callsFake(
        async (
          ctx: v2.Context,
          inputs: v2.InputsWithProjectPath,
          tokenProvider: TokenProvider,
          localSettings?: v2.DeepReadonly<Json>
        ) => {
          return ok(undefined);
        }
      );
    sandbox
      .stub(solution, "getQuestionsForDeploy")
      .callsFake(
        async (
          ctx: v2.Context,
          inputs: v2.InputsWithProjectPath,
          envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
          tokenProvider: TokenProvider
        ) => {
          return ok(undefined);
        }
      );
    sandbox
      .stub(solution, "getQuestionsForPublish")
      .callsFake(
        async (
          ctx: v2.Context,
          inputs: v2.InputsWithProjectPath,
          envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
          tokenProvider: AppStudioTokenProvider
        ) => {
          return ok(undefined);
        }
      );
    assert.isTrue(true);
  });
});
