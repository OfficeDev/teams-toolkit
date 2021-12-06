// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { StorageBrowserPolicy } from "@azure/storage-blob";
import {
  AppPackageFolderName,
  err,
  Func,
  FxError,
  Inputs,
  InputTextConfig,
  InputTextResult,
  MultiSelectConfig,
  MultiSelectResult,
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
import { random } from "lodash";
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
import { deleteFolder, MockSolution, MockSolutionV2, MockTools, randomAppName } from "./utils";

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
    deleteFolder(projectPath);
  });

  describe("Core's basic APIs", async () => {
    const AllEnvParams = [
      { TEAMSFX_APIV2: "false", __TEAMSFX_INSIDER_PREVIEW: "false" },
      { TEAMSFX_APIV2: "false", __TEAMSFX_INSIDER_PREVIEW: "true" },
      { TEAMSFX_APIV2: "true", __TEAMSFX_INSIDER_PREVIEW: "false" },
      { TEAMSFX_APIV2: "true", __TEAMSFX_INSIDER_PREVIEW: "true" },
    ];
    const EnableMultiEnvParams = [
      { TEAMSFX_APIV2: "false", __TEAMSFX_INSIDER_PREVIEW: "true" },
      { TEAMSFX_APIV2: "true", __TEAMSFX_INSIDER_PREVIEW: "true" },
    ];
    const DisableMultiEnvParams = [
      { TEAMSFX_APIV2: "false", __TEAMSFX_INSIDER_PREVIEW: "false" },
      { TEAMSFX_APIV2: "true", __TEAMSFX_INSIDER_PREVIEW: "false" },
    ];
    for (const param of AllEnvParams) {
      describe(`Multi-Env: ${param.__TEAMSFX_INSIDER_PREVIEW}, API V2:${param.TEAMSFX_APIV2}`, () => {
        let mockedEnvRestore: RestoreFn;
        beforeEach(() => {
          sandbox.restore();
          mockedEnvRestore = mockedEnv(param);
        });

        afterEach(() => {
          mockedEnvRestore();
        });
        it("create from new", async () => {
          appName = randomAppName();
          projectPath = path.resolve(os.tmpdir(), appName);
          const expectedInputs: Inputs = {
            platform: Platform.VSCode,
            [CoreQuestionNames.AppName]: appName,
            [CoreQuestionNames.Folder]: os.tmpdir(),
            [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
            projectPath: projectPath,
            solution: mockSolution.name,
            stage: Stage.create,
          };
          it("CLI", async () => {
            const core = new FxCore(tools);
            {
              const inputs: Inputs = { platform: Platform.CLI };
              const res = await core.createProject(inputs);
              assert.isTrue(res.isOk() && res.value === projectPath);
              assert.deepEqual(expectedInputs, inputs);
            }
          });

          it("VSCode without customized default root directory", async () => {
            const core = new FxCore(tools);
            {
              const inputs: Inputs = { platform: Platform.VSCode };
              const res = await core.createProject(inputs);
              assert.isTrue(res.isOk() && res.value === os.homedir() + appName);
              delete expectedInputs.folder;
              assert.deepEqual(expectedInputs, inputs);
            }
          });

          it("VSCode with customized default root directory", async () => {
            const newParam = { ...(param && { TEAMSFX_ROOT_DIRECTORY: os.tmpdir() }) };
            mockedEnvRestore = mockedEnv(newParam);
            const core = new FxCore(tools);
            {
              const inputs: Inputs = { platform: Platform.VSCode };
              const res = await core.createProject(inputs);
              assert.isTrue(res.isOk() && res.value === newParam.TEAMSFX_ROOT_DIRECTORY + appName);
              delete expectedInputs.folder;
              assert.deepEqual(expectedInputs, inputs);
            }
            mockedEnvRestore();
          });
        });

        it("create from new, provision, deploy, localDebug, publish, getQuestion, getQuestionsForUserTask, getProjectConfig", async () => {
          await case1();
        });
        it("getQuestions for create", async () => {
          await case3();
        });
        it("getQuestions, getQuestionsForUserTask for static question", async () => {
          await case4();
        });
        it("crypto: encrypt, decrypt secrets", async () => {
          await case5();
        });
      });
    }
    for (const param of EnableMultiEnvParams) {
      describe(`Multi-Env: ${param.__TEAMSFX_INSIDER_PREVIEW}, API V2:${param.TEAMSFX_APIV2}`, () => {
        let mockedEnvRestore: RestoreFn;
        beforeEach(() => {
          mockedEnvRestore = mockedEnv(param);
        });
        afterEach(() => {
          mockedEnvRestore();
        });
        it("create from sample", async () => {
          await createFromSample();
        });
      });
    }
    for (const param of EnableMultiEnvParams) {
      describe(`Multi-Env: ${param.__TEAMSFX_INSIDER_PREVIEW}, API V2:${param.TEAMSFX_APIV2}`, () => {
        let mockedEnvRestore: RestoreFn;
        beforeEach(() => {
          mockedEnvRestore = mockedEnv(param);
          sandbox.restore();
        });
        afterEach(() => {
          mockedEnvRestore();
        });
        it("scaffold and create new env copy", async () => {
          await envCase1();
        });
        it("scaffold and activate env", async () => {
          await envCase2();
        });
      });
    }
  });

  describe("migrateV1", () => {
    let mockedEnvRestore: RestoreFn;
    beforeEach(() => {
      mockedEnvRestore = mockedEnv({ TEAMSFX_APIV2: "false" });
    });
    afterEach(async () => {
      mockedEnvRestore();
      await fs.remove(path.resolve(os.tmpdir(), "v1projectpath"));
    });
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
        projectPath: path.resolve(os.tmpdir(), "v1projectpath", `${appName}-errorname`),
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
          stage: Stage.migrateV1,
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
        sandbox
          .stub<any, any>(ui, "showMessage")
          .callsFake(async (): Promise<Result<string, FxError>> => {
            return ok("OK");
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

          const projectSettingsResult = await loadProjectSettings(
            inputs,
            commonTools.isMultiEnvEnabled()
          );
          if (projectSettingsResult.isErr()) {
            assert.fail("failed to load project settings");
          }

          const projectSettings = projectSettingsResult.value;
          const validSettingsResult = validateSettings(projectSettings);
          assert.isTrue(validSettingsResult === undefined);

          if (!commonTools.isMultiEnvEnabled()) {
            const envInfoResult = await loadSolutionContext(tools, inputs, projectSettings);
            if (envInfoResult.isErr()) {
              assert.fail("failed to load env info");
            }

            const solutionContext = envInfoResult.value;
            const validRes = validateProject(solutionContext);
            assert.isTrue(validRes === undefined);

            const solutionConfig = solutionContext.envInfo.state.get("solution");
            assert.isTrue(solutionConfig !== undefined);
          }
        }
      });
    });
  });

  it("create project with correct createdFrom", async () => {
    assert.isTrue(true);
    appName = randomAppName();
    projectPath = path.join(os.homedir(), "TeamsApps", appName);
    const expectedInputs: Inputs = {
      platform: Platform.VSCode,
      [CoreQuestionNames.AppName]: appName,
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
      projectPath: projectPath,
      solution: mockSolution.name,
      stage: Stage.create,
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
    sandbox
      .stub<any, any>(ui, "selectOptions")
      .callsFake(async (config: MultiSelectConfig): Promise<Result<MultiSelectResult, FxError>> => {
        if (config.name == "capabilities") {
          return ok({ type: "success", result: ["Tab"] });
        }
        throw err(InvalidInputError("invalid question"));
      });
    const core = new FxCore(tools);
    {
      const inputs: Inputs = { platform: Platform.VSCode };
      const res = await core.createProject(inputs);
      assert.isTrue(res.isOk());
      if (res.isErr()) {
        console.log(res.error);
      }
      assert.deepEqual(expectedInputs, inputs);

      const projectSettingsResult = await loadProjectSettings(
        inputs,
        commonTools.isMultiEnvEnabled()
      );
      if (projectSettingsResult.isErr()) {
        assert.fail("failed to load project settings");
      }

      const projectSettings = projectSettingsResult.value;
      const validSettingsResult = validateSettings(projectSettings);
      assert.isTrue(validSettingsResult === undefined);
      projectSettings.createdFrom == require("../../package.json").version;
    }
  });

  async function case1() {
    appName = randomAppName();
    projectPath = path.join(os.homedir(), "TeamsApps", appName);
    const expectedInputs: Inputs = {
      platform: Platform.VSCode,
      [CoreQuestionNames.AppName]: appName,
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
      projectPath: projectPath,
      solution: mockSolution.name,
      stage: Stage.create,
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
      assert.isTrue(res.isOk());
      assert.deepEqual(expectedInputs, inputs);

      const projectSettingsResult = await loadProjectSettings(
        inputs,
        commonTools.isMultiEnvEnabled()
      );
      if (projectSettingsResult.isErr()) {
        assert.fail("failed to load project settings");
      }

      const projectSettings = projectSettingsResult.value;
      const validSettingsResult = validateSettings(projectSettings);
      assert.isTrue(validSettingsResult === undefined);
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

      const projectSettingsResult = await loadProjectSettings(
        inputs,
        commonTools.isMultiEnvEnabled()
      );
      if (projectSettingsResult.isErr()) {
        assert.fail("failed to load project settings");
      }

      const projectSettings = projectSettingsResult.value;
      const validSettingsResult = validateSettings(projectSettings);
      assert.isTrue(validSettingsResult === undefined);
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

  async function createFromSample() {
    const sampleOption = SampleSelect.staticOptions[0] as OptionItem;
    appName = sampleOption.id;
    projectPath = path.resolve(os.tmpdir(), appName);
    const expectedInputs: Inputs = {
      platform: Platform.CLI,
      [CoreQuestionNames.Folder]: os.tmpdir(),
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionNoVSC.id,
      [CoreQuestionNames.Samples]: sampleOption.id,
      stage: Stage.create,
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
            return ok({ type: "success", result: sampleOption.id });
          }
          throw err(InvalidInputError("invalid question"));
        }
      );
    const core = new FxCore(tools);
    {
      const inputs: Inputs = { platform: Platform.CLI };
      const res = await core.createProject(inputs);
      assert.isTrue(res.isOk() && res.value === projectPath);
      assert.isTrue(inputs.projectId !== undefined);
      assert.isTrue(inputs.projectPath === projectPath);
      expectedInputs.projectId = inputs.projectId;
      expectedInputs.projectPath = inputs.projectPath;
      assert.deepEqual(expectedInputs, inputs);
      inputs.projectPath = projectPath;
      const projectSettingsResult = await loadProjectSettings(
        inputs,
        commonTools.isMultiEnvEnabled()
      );
      if (projectSettingsResult.isErr()) {
        assert.fail("failed to load project settings");
      }

      const projectSettings = projectSettingsResult.value;
      projectSettings.solutionSettings.name = mockSolution.name;
      const validSettingsResult = validateSettings(projectSettings);
      assert.isTrue(validSettingsResult === undefined);
    }
  }

  async function case3() {
    appName = randomAppName();
    projectPath = path.resolve(os.tmpdir(), appName);
    const expectedInputs: Inputs = {
      platform: Platform.CLI,
      [CoreQuestionNames.AppName]: appName,
      [CoreQuestionNames.Folder]: os.tmpdir(),
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
      solution: mockSolution.name,
      stage: Stage.getQuestions,
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
    appName = randomAppName();
    projectPath = path.resolve(os.tmpdir(), appName);
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
    appName = randomAppName();
    projectPath = path.resolve(os.tmpdir(), appName);
    const expectedInputs: Inputs = {
      platform: Platform.CLI,
      [CoreQuestionNames.AppName]: appName,
      [CoreQuestionNames.Folder]: os.tmpdir(),
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
      projectPath: projectPath,
      solution: mockSolution.name,
      env: "dev",
      stage: Stage.create,
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
    const core = new FxCore(tools);
    {
      const inputs: Inputs = { platform: Platform.CLI, env: "dev" };
      const res = await core.createProject(inputs);
      assert.isTrue(res.isOk() && res.value === projectPath);
      assert.deepEqual(expectedInputs, inputs);

      const projectSettingsResult = await loadProjectSettings(
        inputs,
        commonTools.isMultiEnvEnabled()
      );
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

      const projectSettings = projectSettingsResult.value;
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
    appName = randomAppName();
    projectPath = path.resolve(os.tmpdir(), appName);
    const expectedInputs: Inputs = {
      platform: Platform.CLI,
      [CoreQuestionNames.AppName]: appName,
      [CoreQuestionNames.Folder]: os.tmpdir(),
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
      projectPath: projectPath,
      solution: mockSolution.name,
      env: "dev",
      stage: Stage.create,
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
    const core = new FxCore(tools);
    {
      const inputs: Inputs = { platform: Platform.CLI, env: "dev" };
      const res = await core.createProject(inputs);
      assert.isTrue(res.isOk() && res.value === projectPath);
      assert.deepEqual(expectedInputs, inputs);

      const projectSettingsResult = await loadProjectSettings(
        inputs,
        commonTools.isMultiEnvEnabled()
      );
      if (projectSettingsResult.isErr()) {
        assert.fail("failed to load project settings");
      }

      const projectSettings = projectSettingsResult.value;
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
