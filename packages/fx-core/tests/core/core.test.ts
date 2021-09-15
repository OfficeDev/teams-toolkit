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
  traverse,
  V1ManifestFileName,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import Container from "typedi";
import {
  environmentManager,
  FunctionRouterError,
  FxCore,
  InvalidInputError,
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
import { SolutionPlugins } from "../../src/core/SolutionPluginContainer";
import { MockSolution, MockTools, randomAppName } from "./utils";

describe("Core basic APIs", () => {
  const sandbox = sinon.createSandbox();
  const mockSolution = new MockSolution();
  const tools = new MockTools();
  const ui = tools.ui;
  let appName = randomAppName();
  let projectPath = path.resolve(os.tmpdir(), appName);

  beforeEach(() => {
    Container.set(SolutionPlugins.AzureTeamsSolution, mockSolution);
  });

  afterEach(async () => {
    sandbox.restore();
    await fs.rmdir(projectPath, { recursive: true });
  });

  it("happy path: create from new, provision, deploy, localDebug, publish, getQuestion, getQuestionsForUserTask, getProjectConfig", async () => {
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
    {
      const inputs: Inputs = { platform: Platform.CLI };
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

      const solutioConfig = solutionContext.envInfo.profile.get("solution");
      assert.isTrue(solutioConfig !== undefined);
      assert.isTrue(solutioConfig!.get("create") === true);
      assert.isTrue(solutioConfig!.get("scaffold") === true);
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

      const solutionContext = envInfoResult.value;
      const validRes = validateProject(solutionContext);
      assert.isTrue(validRes === undefined);

      const solutioConfig = solutionContext.envInfo.profile.get("solution");
      assert.isTrue(solutioConfig !== undefined);
      assert.isTrue(solutioConfig!.get("provision") === true);
      assert.isTrue(solutioConfig!.get("deploy") === true);
      assert.isTrue(solutioConfig!.get("localDebug") === true);
      assert.isTrue(solutioConfig!.get("publish") === true);
      assert.isTrue(solutioConfig!.get("executeUserTask") === true);
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
  });

  it("happy path: create from sample", async () => {
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
  });

  it("happy path: getQuestions for create", async () => {
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
  });

  it("happy path: getQuestions, getQuestionsForUserTask for static question", async () => {
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
  });

  it("crypto: encrypt, decrypt secrets", async () => {
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
  });

  const testParameters = [
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

  testParameters.forEach((testParam) => {
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
        const inputs: Inputs = { platform: Platform.VSCode, projectPath: testParam.projectPath };
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

  const envParameters = [
    {
      description: "skip ask env name",
      appName: appName,
      projectPath: projectPath,
      skipAppNameQuestion: true,
    },
  ];

  envParameters.forEach((testParam) => {
    it(`happy path: scaffold and create new env copy`, async () => {
      const expectedInputs: Inputs = {
        platform: Platform.CLI,
        [CoreQuestionNames.AppName]: appName,
        [CoreQuestionNames.Folder]: os.tmpdir(),
        [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
        projectPath: projectPath,
        solution: mockSolution.name,
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
        const inputs: Inputs = { platform: Platform.CLI };
        const res = await core.createProject(inputs);
        assert.isTrue(res.isOk() && res.value === projectPath);
        assert.deepEqual(expectedInputs, inputs);

        const projectSettingsResult = await loadProjectSettings(inputs);
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
    });
  });

  envParameters.forEach((testParam) => {
    it(`happy path: create and activate env`, async () => {
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
        const inputs: Inputs = { platform: Platform.CLI };
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

        const createEnvRes = await core.createEnv(inputs);
        assert.isTrue(createEnvRes.isOk());
        inputs.env = "newEnv";
        const activateEnvRes = await core.activateEnv(inputs);
        assert.isTrue(activateEnvRes.isOk());
      }
    });
  });
});
