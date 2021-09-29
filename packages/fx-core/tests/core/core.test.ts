// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AppPackageFolderName,
  err,
  Func,
  FxError,
  Inputs,
  InputTextConfig,
  InputTextResult,
  ok,
  OptionItem,
  Platform,
  QTreeNode,
  Result,
  SelectFolderConfig,
  SelectFolderResult,
  SingleSelectConfig,
  SingleSelectResult,
  SolutionContext,
  Stage,
  TokenProvider,
  traverse,
  V1ManifestFileName,
  v2,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import Container from "typedi";
import {
  environmentManager,
  FunctionRouterError,
  FxCore,
  InvalidInputError,
  isV2,
  validateProject,
  validateSettings,
} from "../../src";
import * as commonTools from "../../src/common/tools";
import { loadSolutionContext } from "../../src/core/middleware/envInfoLoader";
import { loadProjectSettings } from "../../src/core/middleware/projectSettingsLoader";
import {
  CoreQuestionNames,
  SampleSelect,
  ScratchOptionNoVSC,
  ScratchOptionYesVSC,
} from "../../src/core/question";
import { SolutionPlugins, SolutionPluginsV2 } from "../../src/core/SolutionPluginContainer";
import { MockSolution, MockSolutionV2, MockTools, randomAppName } from "./utils";

describe("Core basic APIs", () => {
  const sandbox = sinon.createSandbox();
  const mockSolution = new MockSolution();
  const mockSolutionV2 = new MockSolutionV2();
  const tools = new MockTools();
  const ui = tools.ui;
  let appName = randomAppName();
  let projectPath = path.resolve(os.tmpdir(), appName);

  beforeEach(() => {
    Container.set(SolutionPluginsV2.AzureTeamsSolutionV2, mockSolutionV2);
    Container.set(SolutionPlugins.AzureTeamsSolution, mockSolution);
  });

  afterEach(async () => {
    sandbox.restore();
    await fs.rmdir(projectPath, { recursive: true });
  });

  describe("API V1", () => {
    let mockedEnvRestore: RestoreFn;
    beforeEach(() => {
      mockedEnvRestore = mockedEnv({ TEAMSFX_APIV2: "false" });
    });
    afterEach(async () => {
      mockedEnvRestore();
    });
    it("happy path: create from new, provision, deploy, localDebug, publish, getQuestion, getQuestionsForUserTask, getProjectConfig (API V1)", async () => {
      await case1();
    });
    it("happy path: create from sample (API v1)", async () => {
      await case2();
    });
    it("happy path: getQuestions for create (API v1)", async () => {
      await case3();
    });
    it("happy path: getQuestions, getQuestionsForUserTask for static question (API V1)", async () => {
      await case4();
    });
    it("crypto: encrypt, decrypt secrets (API V1)", async () => {
      await case5();
    });
    it(`happy path: scaffold and create new env copy (API V1)`, async () => {
      await envCase1();
    });
    it(`happy path: create and activate env (API V1)`, async () => {
      await envCase2();
    });
    // it("migrateV1", async () => {
    const migrateV1Params = [
      {
        description: "skip ask app name",
        appName: appName,
        projectPath: path.resolve(os.tmpdir(), "v1projectpath", appName),
        skipAppNameQuestion: true,
      },
      {
        description: "ask app name",
        appName: "v1projectname",
        projectPath: path.resolve(os.tmpdir(), "v1-project-path", `${appName}-errorname`),
        skipAppNameQuestion: false,
      },
    ];

    migrateV1Params.forEach((testParam) => {
      it(`happy path: migrate v1 project ${testParam.description}`, async () => {
        await fs.ensureDir(testParam.projectPath);
        await fs.writeJSON(path.join(testParam.projectPath, "package.json"), {
          msteams: { teamsAppId: "testappid" },
        });
        await fs.ensureDir(path.join(testParam.projectPath, AppPackageFolderName));
        await fs.writeJSON(
          path.join(testParam.projectPath, AppPackageFolderName, V1ManifestFileName),
          {}
        );
        const expectedInputs: Inputs = {
          platform: Platform.VSCode,
          projectPath: testParam.projectPath,
        };

        if (testParam.skipAppNameQuestion) {
          expectedInputs[CoreQuestionNames.DefaultAppNameFunc] = testParam.appName;
        } else {
          expectedInputs[CoreQuestionNames.DefaultAppNameFunc] = undefined;
          expectedInputs[CoreQuestionNames.AppName] = testParam.appName;
        }

        sandbox
          .stub<any, any>(ui, "inputText")
          .callsFake(async (config: InputTextConfig): Promise<Result<InputTextResult, FxError>> => {
            if (config.name === CoreQuestionNames.AppName) {
              return ok({
                type: "success",
                result: expectedInputs[CoreQuestionNames.AppName] as string,
              });
            }
            throw err(InvalidInputError("invalid question"));
          });
        const core = new FxCore(tools);
        {
          const inputs: Inputs = {
            platform: Platform.VSCode,
            projectPath: testParam.projectPath,
          };
          const res = await core.migrateV1Project(inputs);
          assert.isTrue(res.isOk() && res.value === testParam.projectPath);
          assert.deepEqual(expectedInputs, inputs);
          inputs.projectPath = testParam.projectPath;

          const projectSettingsResult = await loadProjectSettings(inputs);
          if (projectSettingsResult.isErr()) {
            assert.fail("failed to load project settings");
          }

          const [projectSettings, projectIdMissing] = projectSettingsResult.value;
          const validSettingsResult = validateSettings(projectSettings);
          assert.isTrue(validSettingsResult === undefined);

          const envInfoResult = await loadSolutionContext(
            tools,
            inputs,
            projectSettings,
            projectIdMissing
          );
          if (envInfoResult.isErr()) {
            assert.fail("failed to load env info");
          }

          const solutionContext = envInfoResult.value;
          const validRes = validateProject(solutionContext);
          assert.isTrue(validRes === undefined);

          const solutioConfig = solutionContext.envInfo.profile.get("solution");
          assert.isTrue(solutioConfig !== undefined);
        }
      });
    });
    // });
  });

  describe("API V2", () => {
    let mockedEnvRestore: RestoreFn;
    beforeEach(() => {
      mockedEnvRestore = mockedEnv({ TEAMSFX_APIV2: "true" });
    });
    afterEach(async () => {
      mockedEnvRestore();
    });
    it("happy path: create from new, provision, deploy, localDebug, publish, getQuestion, getQuestionsForUserTask, getProjectConfig (API V2)", async () => {
      await case1();
    });
    it("happy path: create from sample (API v2)", async () => {
      await case2();
    });
    it("happy path: getQuestions for create (API v2)", async () => {
      await case3();
    });
    it("happy path: getQuestions, getQuestionsForUserTask for static question (API V2)", async () => {
      await case4();
    });
    it("crypto: encrypt, decrypt secrets (API V2)", async () => {
      await case5();
    });
    it(`happy path: scaffold and create new env copy (API V2)`, async () => {
      await envCase1();
    });
    it(`happy path: create and activate env (API V2)`, async () => {
      await envCase2();
    });
  });

  async function case1() {
    const expectedInputs: Inputs = {
      platform: Platform.VSCode,
      [CoreQuestionNames.AppName]: appName,
      [CoreQuestionNames.Folder]: os.tmpdir(),
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
      projectPath: projectPath,
      solution: mockSolution.name,
    };
    sandbox
      .stub<any, any>(ui, "inputText")
      .callsFake(async (config: InputTextConfig): Promise<Result<InputTextResult, FxError>> => {
        if (config.name === CoreQuestionNames.AppName) {
          return ok({
            type: "success",
            result: expectedInputs[CoreQuestionNames.AppName] as string,
          });
        }
        throw InvalidInputError("invalid question");
      });
    sandbox
      .stub<any, any>(ui, "selectFolder")
      .callsFake(
        async (config: SelectFolderConfig): Promise<Result<SelectFolderResult, FxError>> => {
          if (config.name === CoreQuestionNames.Folder) {
            return ok({
              type: "success",
              result: expectedInputs[CoreQuestionNames.Folder] as string,
            });
          }
          throw InvalidInputError("invalid question");
        }
      );
    sandbox
      .stub<any, any>(ui, "selectOption")
      .callsFake(
        async (config: SingleSelectConfig): Promise<Result<SingleSelectResult, FxError>> => {
          if (config.name === CoreQuestionNames.CreateFromScratch) {
            return ok({
              type: "success",
              result: expectedInputs[CoreQuestionNames.CreateFromScratch] as string,
            });
          }
          throw err(InvalidInputError("invalid question"));
        }
      );
    const core = new FxCore(tools);
    {
      const inputs: Inputs = { platform: Platform.VSCode };
      const res = await core.createProject(inputs);
      assert.isTrue(res.isOk() && res.value === projectPath);
      assert.deepEqual(expectedInputs, inputs);

      const projectSettingsResult = await loadProjectSettings(inputs);
      if (projectSettingsResult.isErr()) {
        assert.fail("failed to load project settings");
      }

      const [projectSettings, projectIdMissing] = projectSettingsResult.value;
      const validSettingsResult = validateSettings(projectSettings);
      assert.isTrue(validSettingsResult === undefined);
      const envInfoResult = await loadSolutionContext(
        tools,
        inputs,
        projectSettings,
        projectIdMissing
      );
      if (envInfoResult.isErr()) {
        assert.fail("failed to load env info");
      }

      const solutionContext = envInfoResult.value;
      const validRes = validateProject(solutionContext);
      assert.isTrue(validRes === undefined);

      const solutionConfig = solutionContext.envInfo.profile.get("solution");
      assert.isTrue(solutionConfig !== undefined);
    }
    {
      const inputs: Inputs = { platform: Platform.CLI, projectPath: projectPath };
      let res = await core.provisionResources(inputs);
      assert.isTrue(res.isOk());

      res = await core.deployArtifacts(inputs);
      assert.isTrue(res.isOk());

      res = await core.localDebug(inputs);
      assert.isTrue(res.isOk());

      res = await core.publishApplication(inputs);
      assert.isTrue(res.isOk());

      const func: Func = { method: "test", namespace: "fx-solution-azure" };
      const res2 = await core.executeUserTask(func, inputs);
      assert.isTrue(res2.isOk());

      const projectSettingsResult = await loadProjectSettings(inputs);
      if (projectSettingsResult.isErr()) {
        assert.fail("failed to load project settings");
      }

      const [projectSettings, projectIdMissing] = projectSettingsResult.value;
      const validSettingsResult = validateSettings(projectSettings);
      assert.isTrue(validSettingsResult === undefined);

      const envInfoResult = await loadSolutionContext(
        tools,
        inputs,
        projectSettings,
        projectIdMissing
      );
      if (envInfoResult.isErr()) {
        assert.fail("failed to load env info");
      }
    }

    //getQuestion
    {
      const inputs: Inputs = { platform: Platform.VSCode, projectPath: projectPath };
      const res = await core.getQuestions(Stage.provision, inputs);
      assert.isTrue(res.isOk() && res.value === undefined);
    }
    //getQuestionsForUserTask
    {
      const inputs: Inputs = { platform: Platform.VSCode, projectPath: projectPath };
      const func: Func = { namespace: "fx-solution-azure", method: "mock" };
      const res = await core.getQuestionsForUserTask(func, inputs);
      assert.isTrue(res.isOk() && res.value === undefined);
    }
    //getProjectConfig
    {
      const inputs: Inputs = { platform: Platform.VSCode, projectPath: projectPath };
      const res = await core.getProjectConfig(inputs);
      assert.isTrue(res.isOk());
      if (res.isOk()) {
        const projectConfig = res.value;
        assert.isTrue(projectConfig !== undefined);
        if (projectConfig !== undefined) {
          assert.isTrue(projectConfig.settings !== undefined);
          assert.isTrue(projectConfig.config !== undefined);
        }
      }
    }
  }

  async function case2() {
    const sampleOption = SampleSelect.staticOptions[0] as OptionItem;
    appName = sampleOption.id;
    projectPath = path.resolve(os.tmpdir(), appName);
    const expectedInputs: Inputs = {
      platform: Platform.CLI,
      [CoreQuestionNames.Folder]: os.tmpdir(),
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionNoVSC.id,
      [CoreQuestionNames.Samples]: sampleOption,
    };
    sandbox
      .stub<any, any>(ui, "selectFolder")
      .callsFake(
        async (config: SelectFolderConfig): Promise<Result<SelectFolderResult, FxError>> => {
          if (config.name === CoreQuestionNames.Folder) {
            return ok({
              type: "success",
              result: expectedInputs[CoreQuestionNames.Folder] as string,
            });
          }
          throw err(InvalidInputError("invalid question"));
        }
      );
    sandbox
      .stub<any, any>(ui, "selectOption")
      .callsFake(
        async (config: SingleSelectConfig): Promise<Result<SingleSelectResult, FxError>> => {
          if (config.name === CoreQuestionNames.CreateFromScratch) {
            return ok({
              type: "success",
              result: expectedInputs[CoreQuestionNames.CreateFromScratch] as string,
            });
          }
          if (config.name === CoreQuestionNames.Samples) {
            return ok({ type: "success", result: sampleOption });
          }
          throw err(InvalidInputError("invalid question"));
        }
      );
    const core = new FxCore(tools);
    {
      const inputs: Inputs = { platform: Platform.CLI };
      const res = await core.createProject(inputs);
      assert.isTrue(res.isOk() && res.value === projectPath);
      assert.deepEqual(expectedInputs, inputs);
      inputs.projectPath = projectPath;

      const projectSettingsResult = await loadProjectSettings(inputs);
      if (projectSettingsResult.isErr()) {
        assert.fail("failed to load project settings");
      }

      const [projectSettings, projectIdMissing] = projectSettingsResult.value;
      projectSettings.solutionSettings.name = mockSolution.name;
      const validSettingsResult = validateSettings(projectSettings);
      assert.isTrue(validSettingsResult === undefined);

      const envInfoResult = await loadSolutionContext(
        tools,
        inputs,
        projectSettings,
        projectIdMissing
      );
      if (envInfoResult.isErr()) {
        assert.fail("failed to load env info");
      }

      const solutionContext = envInfoResult.value;
      const validRes = validateProject(solutionContext);
      assert.isTrue(validRes === undefined);

      const solutioConfig = solutionContext.envInfo.profile.get("solution");
      assert.isTrue(solutioConfig !== undefined);
    }
  }

  async function case3() {
    const expectedInputs: Inputs = {
      platform: Platform.CLI,
      [CoreQuestionNames.AppName]: appName,
      [CoreQuestionNames.Folder]: os.tmpdir(),
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
      solution: mockSolution.name,
    };
    sandbox
      .stub<any, any>(ui, "inputText")
      .callsFake(async (config: InputTextConfig): Promise<Result<InputTextResult, FxError>> => {
        if (config.name === CoreQuestionNames.AppName) {
          return ok({
            type: "success",
            result: expectedInputs[CoreQuestionNames.AppName] as string,
          });
        }
        throw err(InvalidInputError("invalid question"));
      });
    sandbox
      .stub<any, any>(ui, "selectFolder")
      .callsFake(
        async (config: SelectFolderConfig): Promise<Result<SelectFolderResult, FxError>> => {
          if (config.name === CoreQuestionNames.Folder) {
            return ok({
              type: "success",
              result: expectedInputs[CoreQuestionNames.Folder] as string,
            });
          }
          throw err(InvalidInputError("invalid question"));
        }
      );
    sandbox
      .stub<any, any>(ui, "selectOption")
      .callsFake(
        async (config: SingleSelectConfig): Promise<Result<SingleSelectResult, FxError>> => {
          if (config.name === CoreQuestionNames.CreateFromScratch) {
            return ok({
              type: "success",
              result: expectedInputs[CoreQuestionNames.CreateFromScratch] as string,
            });
          }
          throw err(InvalidInputError("invalid question"));
        }
      );

    const core = new FxCore(tools);
    const inputs: Inputs = { platform: Platform.CLI };
    const res = await core.getQuestions(Stage.create, inputs);
    assert.isTrue(res.isOk());

    if (res.isOk()) {
      const node = res.value;
      if (node) {
        const traverseRes = await traverse(node, inputs, ui);
        assert.isTrue(traverseRes.isOk());
      }
      assert.deepEqual(expectedInputs, inputs);
    }
  }

  async function case4() {
    const core = new FxCore(tools);
    {
      const inputs: Inputs = { platform: Platform.VS };
      const res = await core.getQuestions(Stage.provision, inputs);
      assert.isTrue(res.isOk() && res.value === undefined);
    }
    {
      const inputs: Inputs = { platform: Platform.CLI_HELP };
      const res = await core.getQuestions(Stage.provision, inputs);
      assert.isTrue(res.isOk() && res.value === undefined);
    }
    {
      const inputs: Inputs = { platform: Platform.VS };
      const func: Func = { namespace: "fx-solution-azure", method: "mock" };
      const res = await core.getQuestionsForUserTask(func, inputs);
      assert.isTrue(res.isOk() && res.value === undefined);
    }
    {
      const inputs: Inputs = { platform: Platform.CLI_HELP };
      const func: Func = { namespace: "fx-solution-azure", method: "mock" };
      const res = await core.getQuestionsForUserTask(func, inputs);
      assert.isTrue(res.isOk() && res.value === undefined);
    }
    {
      const inputs: Inputs = { platform: Platform.CLI_HELP };
      const func: Func = { namespace: "", method: "mock" };
      const res = await core.getQuestionsForUserTask(func, inputs);
      assert.isTrue(res.isErr() && res.error.name === FunctionRouterError(func).name);
    }

    if (isV2()) {
      sandbox
        .stub<any, any>(mockSolutionV2, "getQuestions")
        .callsFake(
          async (
            ctx: v2.Context,
            inputs: Inputs,
            envInfo: v2.DeepReadonly<v2.EnvInfoV2>,
            tokenProvider: TokenProvider
          ): Promise<Result<QTreeNode | undefined, FxError>> => {
            return ok(
              new QTreeNode({
                type: "text",
                name: "mock-question",
                title: "mock-question",
              })
            );
          }
        );
      sandbox
        .stub<any, any>(mockSolutionV2, "getQuestionsForUserTask")
        .callsFake(
          async (
            ctx: v2.Context,
            inputs: Inputs,
            func: Func,
            envInfo: v2.DeepReadonly<v2.EnvInfoV2>,
            tokenProvider: TokenProvider
          ): Promise<Result<QTreeNode | undefined, FxError>> => {
            return ok(
              new QTreeNode({
                type: "text",
                name: "mock-question-user-task",
                title: "mock-question-user-task",
              })
            );
          }
        );
    } else {
      sandbox
        .stub<any, any>(mockSolution, "getQuestions")
        .callsFake(
          async (
            task: Stage,
            ctx: SolutionContext
          ): Promise<Result<QTreeNode | undefined, FxError>> => {
            return ok(
              new QTreeNode({
                type: "text",
                name: "mock-question",
                title: "mock-question",
              })
            );
          }
        );
      sandbox
        .stub<any, any>(mockSolution, "getQuestionsForUserTask")
        .callsFake(
          async (
            func: Func,
            ctx: SolutionContext
          ): Promise<Result<QTreeNode | undefined, FxError>> => {
            return ok(
              new QTreeNode({
                type: "text",
                name: "mock-question-user-task",
                title: "mock-question-user-task",
              })
            );
          }
        );
    }

    {
      const inputs: Inputs = { platform: Platform.VS };
      const res = await core.getQuestions(Stage.provision, inputs);
      assert.isTrue(res.isOk() && res.value && res.value.data.name === "mock-question");
    }
    {
      const inputs: Inputs = { platform: Platform.CLI_HELP };
      const res = await core.getQuestions(Stage.provision, inputs);
      assert.isTrue(res.isOk() && res.value && res.value.data.name === "mock-question");
    }
    {
      const inputs: Inputs = { platform: Platform.VS };
      const func: Func = { namespace: "fx-solution-azure", method: "mock" };
      const res = await core.getQuestionsForUserTask(func, inputs);
      assert.isTrue(res.isOk() && res.value && res.value.data.name === "mock-question-user-task");
    }
    {
      const inputs: Inputs = { platform: Platform.CLI_HELP };
      const func: Func = { namespace: "fx-solution-azure", method: "mock" };
      const res = await core.getQuestionsForUserTask(func, inputs);
      assert.isTrue(res.isOk() && res.value && res.value.data.name === "mock-question-user-task");
    }
  }

  async function case5() {
    appName = randomAppName();
    projectPath = path.resolve(os.tmpdir(), appName);
    const expectedInputs: Inputs = {
      platform: Platform.CLI,
      [CoreQuestionNames.AppName]: appName,
      [CoreQuestionNames.Folder]: os.tmpdir(),
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
      projectPath: projectPath,
      solution: mockSolution.name,
    };
    sandbox
      .stub<any, any>(ui, "inputText")
      .callsFake(async (config: InputTextConfig): Promise<Result<InputTextResult, FxError>> => {
        if (config.name === CoreQuestionNames.AppName) {
          return ok({
            type: "success",
            result: expectedInputs[CoreQuestionNames.AppName] as string,
          });
        }
        throw err(InvalidInputError("invalid question"));
      });
    sandbox
      .stub<any, any>(ui, "selectFolder")
      .callsFake(
        async (config: SelectFolderConfig): Promise<Result<SelectFolderResult, FxError>> => {
          if (config.name === CoreQuestionNames.Folder) {
            return ok({
              type: "success",
              result: expectedInputs[CoreQuestionNames.Folder] as string,
            });
          }
          throw InvalidInputError("invalid question");
        }
      );
    sandbox
      .stub<any, any>(ui, "selectOption")
      .callsFake(
        async (config: SingleSelectConfig): Promise<Result<SingleSelectResult, FxError>> => {
          if (config.name === CoreQuestionNames.CreateFromScratch) {
            return ok({
              type: "success",
              result: expectedInputs[CoreQuestionNames.CreateFromScratch] as string,
            });
          }
          throw InvalidInputError("invalid question");
        }
      );
    const core = new FxCore(tools);
    {
      const inputs: Inputs = { platform: Platform.CLI };
      const res = await core.createProject(inputs);
      assert.isTrue(res.isOk() && res.value === projectPath);

      const encrypted = await core.encrypt("test secret data", inputs);
      assert.isTrue(encrypted.isOk());
      if (encrypted.isOk()) {
        assert.isTrue(encrypted.value.startsWith("crypto_"));
        const decrypted = await core.decrypt(encrypted.value, inputs);
        assert(decrypted.isOk());
        if (decrypted.isOk()) {
          assert.strictEqual(decrypted.value, "test secret data");
        }
      }
    }
  }

  async function envCase1() {
    const expectedInputs: Inputs = {
      platform: Platform.CLI,
      [CoreQuestionNames.AppName]: appName,
      [CoreQuestionNames.Folder]: os.tmpdir(),
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
      projectPath: projectPath,
      solution: mockSolution.name,
      env: "dev",
    };

    const newEnvName = "newEnv";
    sandbox
      .stub<any, any>(ui, "inputText")
      .callsFake(async (config: InputTextConfig): Promise<Result<InputTextResult, FxError>> => {
        if (config.name === CoreQuestionNames.AppName) {
          return ok({
            type: "success",
            result: expectedInputs[CoreQuestionNames.AppName] as string,
          });
        }
        if (config.name === CoreQuestionNames.NewTargetEnvName) {
          return ok({
            type: "success",
            result: newEnvName,
          });
        }
        throw err(InvalidInputError("invalid question"));
      });
    sandbox
      .stub<any, any>(ui, "selectFolder")
      .callsFake(
        async (config: SelectFolderConfig): Promise<Result<SelectFolderResult, FxError>> => {
          if (config.name === CoreQuestionNames.Folder) {
            return ok({
              type: "success",
              result: expectedInputs[CoreQuestionNames.Folder] as string,
            });
          }
          throw err(InvalidInputError("invalid question"));
        }
      );
    sandbox
      .stub<any, any>(ui, "selectOption")
      .callsFake(
        async (config: SingleSelectConfig): Promise<Result<SingleSelectResult, FxError>> => {
          if (config.name === CoreQuestionNames.CreateFromScratch) {
            return ok({
              type: "success",
              result: expectedInputs[CoreQuestionNames.CreateFromScratch] as string,
            });
          }
          throw err(InvalidInputError("invalid question"));
        }
      );
    sandbox.stub(commonTools, "isMultiEnvEnabled").returns(true);
    const core = new FxCore(tools);
    {
      const inputs: Inputs = { platform: Platform.CLI, env: "dev" };
      const res = await core.createProject(inputs);
      assert.isTrue(res.isOk() && res.value === projectPath);
      assert.deepEqual(expectedInputs, inputs);

      const projectSettingsResult = await loadProjectSettings(inputs, true);
      if (projectSettingsResult.isErr()) {
        assert.fail("failed to load project settings");
      }

      // assert default env is created on scaffold
      const envListResult = await environmentManager.listEnvConfigs(inputs.projectPath!);
      if (envListResult.isErr()) {
        assert.fail("failed to list env names");
      }
      assert.isTrue(envListResult.value.length === 1);
      assert.isTrue(envListResult.value[0] === environmentManager.getDefaultEnvName());

      const [projectSettings, projectIdMissing] = projectSettingsResult.value;
      const validSettingsResult = validateSettings(projectSettings);
      assert.isTrue(validSettingsResult === undefined);

      const createEnvRes = await core.createEnv(inputs);
      assert.isTrue(createEnvRes.isOk());

      const newEnvListResult = await environmentManager.listEnvConfigs(inputs.projectPath!);
      if (newEnvListResult.isErr()) {
        assert.fail("failed to list env names");
      }
      assert.isTrue(newEnvListResult.value.length === 2);
      assert.isTrue(newEnvListResult.value[0] === environmentManager.getDefaultEnvName());
      assert.isTrue(newEnvListResult.value[1] === newEnvName);
    }
  }

  async function envCase2() {
    const expectedInputs: Inputs = {
      platform: Platform.CLI,
      [CoreQuestionNames.AppName]: appName,
      [CoreQuestionNames.Folder]: os.tmpdir(),
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
      projectPath: projectPath,
      solution: mockSolution.name,
      env: "dev",
    };
    sandbox
      .stub<any, any>(ui, "inputText")
      .callsFake(async (config: InputTextConfig): Promise<Result<InputTextResult, FxError>> => {
        if (config.name === CoreQuestionNames.AppName) {
          return ok({
            type: "success",
            result: expectedInputs[CoreQuestionNames.AppName] as string,
          });
        }
        if (config.name === CoreQuestionNames.NewTargetEnvName) {
          return ok({
            type: "success",
            result: "newEnv",
          });
        }
        throw err(InvalidInputError("invalid question"));
      });
    sandbox
      .stub<any, any>(ui, "selectFolder")
      .callsFake(
        async (config: SelectFolderConfig): Promise<Result<SelectFolderResult, FxError>> => {
          if (config.name === CoreQuestionNames.Folder) {
            return ok({
              type: "success",
              result: expectedInputs[CoreQuestionNames.Folder] as string,
            });
          }
          throw err(InvalidInputError("invalid question"));
        }
      );
    sandbox
      .stub<any, any>(ui, "selectOption")
      .callsFake(
        async (config: SingleSelectConfig): Promise<Result<SingleSelectResult, FxError>> => {
          if (config.name === CoreQuestionNames.CreateFromScratch) {
            return ok({
              type: "success",
              result: expectedInputs[CoreQuestionNames.CreateFromScratch] as string,
            });
          }
          throw err(InvalidInputError("invalid question"));
        }
      );
    sandbox.stub(commonTools, "isMultiEnvEnabled").returns(true);
    const core = new FxCore(tools);
    {
      const inputs: Inputs = { platform: Platform.CLI, env: "dev" };
      const res = await core.createProject(inputs);
      assert.isTrue(res.isOk() && res.value === projectPath);
      assert.deepEqual(expectedInputs, inputs);

      const projectSettingsResult = await loadProjectSettings(inputs, true);
      if (projectSettingsResult.isErr()) {
        assert.fail("failed to load project settings");
      }

      const [projectSettings, projectIdMissing] = projectSettingsResult.value;
      const validSettingsResult = validateSettings(projectSettings);
      assert.isTrue(validSettingsResult === undefined);

      const createEnvRes = await core.createEnv(inputs);
      assert.isTrue(createEnvRes.isOk());
      inputs.env = "newEnv";
      const activateEnvRes = await core.activateEnv(inputs);
      assert.isTrue(activateEnvRes.isOk());
    }
  }
});
