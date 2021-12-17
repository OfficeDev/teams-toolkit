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
  ok,
  Platform,
  QTreeNode,
  Result,
  Solution,
  SolutionContext,
  Stage,
  v2,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import sinon from "sinon";
import { CoreHookContext, InvalidInputError, isV2, setTools } from "../../../src";
import {
  newSolutionContext,
  QuestionModelMW,
  SolutionLoaderMW,
} from "../../../src/core/middleware";
import { MockProjectSettings, MockTools, randomAppName } from "../utils";
describe("Middleware - QuestionModelMW", () => {
  const sandbox = sinon.createSandbox();
  afterEach(function () {
    sandbox.restore();
  });
  const inputs: Inputs = { platform: Platform.VSCode };
  const tools = new MockTools();
  const projectSettings = MockProjectSettings("mockappforqm");
  const MockContextLoaderMW = async (ctx: CoreHookContext, next: NextFunction) => {
    if (isV2()) {
      ctx.contextV2 = {
        userInteraction: tools.ui,
        logProvider: tools.logProvider,
        telemetryReporter: tools.telemetryReporter!,
        cryptoProvider: tools.cryptoProvider,
        permissionRequestProvider: tools.permissionRequestProvider,
        projectSetting: projectSettings,
      };
    } else {
      ctx.solutionContext = await newSolutionContext(tools, inputs);
    }
    await next();
  };
  setTools(tools);
  const ui = tools.ui;
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
    async createProject(inputs: Inputs): Promise<Result<string, FxError>> {
      if (inputs[questionName] === questionValue) return ok("true");
      return err(InvalidInputError(questionName));
    }

    async _return(inputs: Inputs): Promise<Result<any, FxError>> {
      if (inputs[questionName] === questionValue) return ok(true);
      return err(InvalidInputError(questionName));
    }

    async provisionResources(inputs: Inputs): Promise<Result<any, FxError>> {
      return this._return(inputs);
    }

    async deployArtifacts(inputs: Inputs): Promise<Result<any, FxError>> {
      return this._return(inputs);
    }

    async localDebug(inputs: Inputs): Promise<Result<any, FxError>> {
      return this._return(inputs);
    }

    async publishApplication(inputs: Inputs): Promise<Result<any, FxError>> {
      return this._return(inputs);
    }

    async executeUserTask(func: Func, inputs: Inputs): Promise<Result<unknown, FxError>> {
      return this._return(inputs);
    }

    async _getQuestionsForCreateProject(
      inputs: Inputs
    ): Promise<Result<QTreeNode | undefined, FxError>> {
      const node = new QTreeNode({
        type: "text",
        name: questionName,
        title: "test",
      });
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
  }

  hooks(MockCoreForQM, {
    createProject: [SolutionLoaderMW(), MockContextLoaderMW, QuestionModelMW],
    provisionResources: [SolutionLoaderMW(), MockContextLoaderMW, QuestionModelMW],
    deployArtifacts: [SolutionLoaderMW(), MockContextLoaderMW, QuestionModelMW],
    localDebug: [SolutionLoaderMW(), MockContextLoaderMW, QuestionModelMW],
    publishApplication: [SolutionLoaderMW(), MockContextLoaderMW, QuestionModelMW],
    executeUserTask: [SolutionLoaderMW(), MockContextLoaderMW, QuestionModelMW],
  });
  const EnvParams = [{ TEAMSFX_APIV2: "false" }, { TEAMSFX_APIV2: "true" }];

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
        sandbox.stub(ui, "inputText").callsFake(async (config: InputTextConfig) => {
          return ok({ type: "success", result: questionValue });
        });
        const my = new MockCoreForQM();

        let res = await my.createProject(inputs);
        assert.isTrue(res.isOk() && res.value === "true");

        delete inputs[questionName];
        questionValue = randomAppName() + "provisionResources";
        res = await my.provisionResources(inputs);
        assert.isTrue(res.isOk() && res.value);

        delete inputs[questionName];
        questionValue = randomAppName() + "deployArtifacts";
        res = await my.deployArtifacts(inputs);
        assert.isTrue(res.isOk() && res.value);

        delete inputs[questionName];
        questionValue = randomAppName() + "localDebug";
        res = await my.localDebug(inputs);
        assert.isTrue(res.isOk() && res.value);

        delete inputs[questionName];
        questionValue = randomAppName() + "publishApplication";
        res = await my.publishApplication(inputs);
        assert.isTrue(res.isOk() && res.value);

        delete inputs[questionName];
        questionValue = randomAppName() + "executeUserTask";
        const func: Func = { method: "test", namespace: "" };
        const userTaskRes = await my.executeUserTask(func, inputs);
        assert.isTrue(userTaskRes.isOk() && userTaskRes.value);
      });

      it("get question or traverse question tree error", async () => {
        sandbox.stub(ui, "inputText").callsFake(async (config: InputTextConfig) => {
          return ok({ type: "success", result: questionValue });
        });
        const my = new MockCoreForQM();
        my._getQuestionsForCreateProject = async function (
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

        let res = await my.createProject(inputs);
        assert(res.isErr() && res.error.name === InvalidInputError("").name);

        delete inputs[questionName];
        questionValue = randomAppName() + "provisionResources";
        res = await my.provisionResources(inputs);
        assert(res.isErr() && res.error.name === InvalidInputError("").name);

        delete inputs[questionName];
        questionValue = randomAppName() + "deployArtifacts";
        res = await my.deployArtifacts(inputs);
        assert(res.isErr() && res.error.name === InvalidInputError("").name);

        delete inputs[questionName];
        questionValue = randomAppName() + "localDebug";
        res = await my.localDebug(inputs);
        assert(res.isErr() && res.error.name === InvalidInputError("").name);

        delete inputs[questionName];
        questionValue = randomAppName() + "publishApplication";
        res = await my.publishApplication(inputs);
        assert(res.isErr() && res.error.name === InvalidInputError("").name);

        delete inputs[questionName];
        questionValue = randomAppName() + "executeUserTask";
        const func: Func = { method: "test", namespace: "" };
        const res2 = await my.executeUserTask(func, inputs);
        assert(res2.isErr() && res2.error.name === new EmptyOptionError().name);
      });
    });
  }
});
