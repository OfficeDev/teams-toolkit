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
  Stage,
  TokenProvider,
  traverse,
  V1ManifestFileName,
  v2,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import { Container } from "typedi";
import {
  environmentManager,
  FxCore,
  InvalidInputError,
  setTools,
  validateSettings,
} from "../../src";
import { ConstantString } from "../../src/common/constants";
import { loadProjectSettings } from "../../src/core/middleware/projectSettingsLoader";
import {
  BotOptionItem,
  CoreQuestionNames,
  MessageExtensionItem,
  ProgrammingLanguageQuestion,
  SampleSelect,
  ScratchOptionNoVSC,
  ScratchOptionYesVSC,
  TabOptionItem,
  TabSPFxItem,
} from "../../src/core/question";
import { SolutionPlugins, SolutionPluginsV2 } from "../../src/core/SolutionPluginContainer";
import { deleteFolder, MockSolution, MockSolutionV2, MockTools, randomAppName } from "./utils";
import fs from "fs-extra";
describe("Core basic APIs", () => {
  const sandbox = sinon.createSandbox();
  const mockSolutionV1 = new MockSolution();
  const mockSolutionV2 = new MockSolutionV2();
  const tools = new MockTools();
  let appName = randomAppName();
  let projectPath = path.resolve(os.tmpdir(), appName);
  let mockedEnvRestore: RestoreFn;
  beforeEach(() => {
    setTools(tools);
    mockedEnvRestore = mockedEnv({ TEAMSFX_APIV3: "false" });
    Container.set(SolutionPluginsV2.AzureTeamsSolutionV2, mockSolutionV2);
    Container.set(SolutionPlugins.AzureTeamsSolution, mockSolutionV1);
  });
  afterEach(async () => {
    sandbox.restore();
    deleteFolder(projectPath);
    mockedEnvRestore();
  });
  describe("create from new", async () => {
    it("CLI with folder input", async () => {
      appName = randomAppName();
      const core = new FxCore(tools);
      const inputs: Inputs = {
        platform: Platform.CLI,
        [CoreQuestionNames.Folder]: os.tmpdir(),
        [CoreQuestionNames.AppName]: appName,
        [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
        [CoreQuestionNames.ProgrammingLanguage]: "javascript",
        [CoreQuestionNames.Capabilities]: ["Tab"],
        solution: mockSolutionV2.name,
        stage: Stage.create,
      };
      const res = await core.createProject(inputs);
      projectPath = path.resolve(os.tmpdir(), appName);
      assert.isTrue(res.isOk() && res.value === projectPath);
    });

    it("VSCode without customized default root directory", async () => {
      appName = randomAppName();
      const core = new FxCore(tools);
      const inputs: Inputs = {
        platform: Platform.VSCode,
        [CoreQuestionNames.AppName]: appName,
        [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
        [CoreQuestionNames.ProgrammingLanguage]: "javascript",
        [CoreQuestionNames.Capabilities]: ["Tab"],
        solution: mockSolutionV2.name,
        stage: Stage.create,
      };
      const res = await core.createProject(inputs);
      projectPath = path.join(os.homedir(), ConstantString.rootFolder, appName);
      assert.isTrue(res.isOk() && res.value === projectPath);
      const projectSettingsResult = await loadProjectSettings(inputs, true);
      assert.isTrue(projectSettingsResult.isOk());
      if (projectSettingsResult.isOk()) {
        const projectSettings = projectSettingsResult.value;
        const validSettingsResult = validateSettings(projectSettings);
        assert.isTrue(validSettingsResult === undefined);
        assert.isTrue(projectSettings.version === "2.1.0");
      }
    });

    it("VSCode with customized default root directory", async () => {
      appName = randomAppName();
      const newParam = { TEAMSFX_APIV3: "false", TEAMSFX_ROOT_DIRECTORY: os.tmpdir() };
      mockedEnvRestore = mockedEnv(newParam);
      const core = new FxCore(tools);
      const inputs: Inputs = {
        platform: Platform.VSCode,
        [CoreQuestionNames.AppName]: appName,
        [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
        [CoreQuestionNames.ProgrammingLanguage]: "javascript",
        [CoreQuestionNames.Capabilities]: ["Tab"],
        solution: mockSolutionV2.name,
        stage: Stage.create,
      };
      const res = await core.createProject(inputs);
      projectPath = path.resolve(
        newParam.TEAMSFX_ROOT_DIRECTORY.replace("${homeDir}", os.homedir()),
        appName
      );
      assert.isTrue(res.isOk() && res.value === projectPath);
      mockedEnvRestore();
    });
  });

  it("createProject, provision, deploy, localDebug, publish, executeUserTask, getProjectConfig, getQuestionsForUserTask, encrypt, decrypt", async () => {
    appName = randomAppName();
    const newParam = { TEAMSFX_APIV3: "false", TEAMSFX_ROOT_DIRECTORY: os.tmpdir() };
    mockedEnvRestore = mockedEnv(newParam);
    const core = new FxCore(tools);
    const inputs: Inputs = {
      platform: Platform.VSCode,
      [CoreQuestionNames.AppName]: appName,
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
      [CoreQuestionNames.ProgrammingLanguage]: "javascript",
      [CoreQuestionNames.Capabilities]: ["Tab"],
      solution: mockSolutionV2.name,
      stage: Stage.create,
    };
    const createRes = await core.createProject(inputs);
    projectPath = path.resolve(
      newParam.TEAMSFX_ROOT_DIRECTORY.replace("${homeDir}", os.homedir()),
      appName
    );
    assert.isTrue(createRes.isOk() && createRes.value === projectPath);

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

    const configRes = await core.getProjectConfig(inputs);
    assert.isTrue(configRes.isOk());
    if (configRes.isOk()) {
      const projectConfig = configRes.value;
      assert.isTrue(projectConfig !== undefined);
      if (projectConfig !== undefined) {
        assert.isTrue(projectConfig.settings !== undefined);
        assert.isTrue(projectConfig.config !== undefined);
      }
    }
    const questionsForUserTaskRes = await core.getQuestionsForUserTask(func, inputs);
    assert.isTrue(questionsForUserTaskRes.isOk() && questionsForUserTaskRes.value === undefined);

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
    mockedEnvRestore();
  });

  describe("getQuestions", async () => {
    for (const platform of [Platform.VS, Platform.CLI, Platform.CLI_HELP, Platform.VSCode]) {
      it(`getQuestions for create, platform = ${platform}`, async () => {
        const inputs: Inputs = { platform: platform };
        const core = new FxCore(tools);
        const res = await core.getQuestions(Stage.create, inputs);
        assert.isTrue(res.isOk() && res.value !== undefined);
      });
    }
    beforeEach(() => {
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
    });
    afterEach(async () => {
      sandbox.restore();
    });
    it("getQuestions for provision success, platform = CLI_HELP", async () => {
      const inputs: Inputs = { platform: Platform.CLI_HELP };
      const core = new FxCore(tools);
      const res = await core.getQuestions(Stage.provision, inputs);
      assert.isTrue(res.isOk() && res.value && res.value.data.name === "mock-question");
    });
    it("getQuestions for provision failed, platform = VSCode", async () => {
      const inputs: Inputs = { platform: Platform.VSCode };
      const core = new FxCore(tools);
      const res = await core.getQuestions(Stage.provision, inputs);
      assert.isTrue(res.isErr());
    });
    it("getQuestionsForUserTask success, platform = CLI_HELP", async () => {
      const inputs: Inputs = { platform: Platform.CLI_HELP };
      const core = new FxCore(tools);
      const func: Func = { namespace: "fx-solution-azure", method: "mock" };
      const res = await core.getQuestionsForUserTask(func, inputs);
      assert.isTrue(res.isOk() && res.value && res.value.data.name === "mock-question-user-task");
    });
    it("getQuestionsForUserTask failed, platform = VSCode", async () => {
      const inputs: Inputs = { platform: Platform.VSCode };
      const core = new FxCore(tools);
      const func: Func = { namespace: "fx-solution-azure", method: "mock" };
      const res = await core.getQuestionsForUserTask(func, inputs);
      assert.isTrue(res.isErr());
    });
    it("getQuestions for create, traverse question tree", async () => {
      appName = randomAppName();
      projectPath = path.resolve(os.tmpdir(), appName);
      const expectedInputs: Inputs = {
        platform: Platform.CLI,
        [CoreQuestionNames.AppName]: appName,
        [CoreQuestionNames.Folder]: os.tmpdir(),
        [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
        stage: Stage.getQuestions,
      };
      expectedInputs[CoreQuestionNames.Capabilities] = [TabOptionItem.id];
      expectedInputs[CoreQuestionNames.ProgrammingLanguage] = "javascript";
      sandbox
        .stub<any, any>(tools.ui, "inputText")
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
        .stub<any, any>(tools.ui, "selectFolder")
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
        .stub<any, any>(tools.ui, "selectOption")
        .callsFake(
          async (config: SingleSelectConfig): Promise<Result<SingleSelectResult, FxError>> => {
            if (config.name === CoreQuestionNames.CreateFromScratch) {
              return ok({
                type: "success",
                result: expectedInputs[CoreQuestionNames.CreateFromScratch] as string,
              });
            } else if (config.name === CoreQuestionNames.ProgrammingLanguage) {
              return ok({
                type: "success",
                result: expectedInputs[CoreQuestionNames.ProgrammingLanguage] as string,
              });
            }
            throw err(InvalidInputError("invalid question"));
          }
        );
      sandbox
        .stub<any, any>(tools.ui, "selectOptions")
        .callsFake(
          async (config: MultiSelectConfig): Promise<Result<MultiSelectResult, FxError>> => {
            if (config.name == "capabilities") {
              return ok({
                type: "success",
                result: expectedInputs[CoreQuestionNames.Capabilities],
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
          const traverseRes = await traverse(node, inputs, tools.ui);
          assert.isTrue(traverseRes.isOk());
        }
        assert.deepEqual(expectedInputs, inputs);
      }
    });
  });
  it("scaffold and createEnv, activateEnv", async () => {
    appName = randomAppName();
    const core = new FxCore(tools);
    const inputs: Inputs = {
      platform: Platform.CLI,
      [CoreQuestionNames.AppName]: appName,
      [CoreQuestionNames.Folder]: os.tmpdir(),
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
      [CoreQuestionNames.ProgrammingLanguage]: "javascript",
      [CoreQuestionNames.Capabilities]: ["Tab"],
      solution: mockSolutionV2.name,
      stage: Stage.create,
    };
    const createRes = await core.createProject(inputs);
    assert.isTrue(createRes.isOk());
    projectPath = path.resolve(os.tmpdir(), appName);

    const newEnvName = "newEnv";
    const envListResult = await environmentManager.listEnvConfigs(projectPath);
    if (envListResult.isErr()) {
      assert.fail("failed to list env names");
    }
    assert.isTrue(envListResult.value.length === 1);
    assert.isTrue(envListResult.value[0] === environmentManager.getDefaultEnvName());
    inputs[CoreQuestionNames.NewTargetEnvName] = newEnvName;
    const createEnvRes = await core.createEnv(inputs);
    assert.isTrue(createEnvRes.isOk());

    const newEnvListResult = await environmentManager.listEnvConfigs(projectPath);
    if (newEnvListResult.isErr()) {
      assert.fail("failed to list env names");
    }
    assert.isTrue(newEnvListResult.value.length === 2);
    assert.isTrue(newEnvListResult.value[0] === environmentManager.getDefaultEnvName());
    assert.isTrue(newEnvListResult.value[1] === newEnvName);

    inputs.env = "newEnv";
    const activateEnvRes = await core.activateEnv(inputs);
    assert.isTrue(activateEnvRes.isOk());
  });

  it("ProgrammingLanguageQuestion", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      [CoreQuestionNames.Capabilities]: [TabSPFxItem.id],
    };
    if (
      ProgrammingLanguageQuestion.dynamicOptions &&
      ProgrammingLanguageQuestion.placeholder &&
      typeof ProgrammingLanguageQuestion.placeholder === "function"
    ) {
      const options = ProgrammingLanguageQuestion.dynamicOptions(inputs);
      assert.deepEqual([{ id: "typescript", label: "TypeScript" }], options);
      const placeholder = ProgrammingLanguageQuestion.placeholder(inputs);
      assert.equal("SPFx is currently supporting TypeScript only.", placeholder);
    }

    languageAssert({
      platform: Platform.VSCode,
      [CoreQuestionNames.Capabilities]: [TabOptionItem.id],
    });
    languageAssert({
      platform: Platform.VSCode,
      [CoreQuestionNames.Capabilities]: [BotOptionItem.id],
    });
    languageAssert({
      platform: Platform.VSCode,
      [CoreQuestionNames.Capabilities]: [MessageExtensionItem.id],
    });
    languageAssert({
      platform: Platform.VSCode,
      [CoreQuestionNames.Capabilities]: [TabOptionItem.id, BotOptionItem.id],
    });

    languageAssert({
      platform: Platform.VSCode,
      [CoreQuestionNames.Capabilities]: [TabOptionItem.id, MessageExtensionItem.id],
    });

    languageAssert({
      platform: Platform.VSCode,
      [CoreQuestionNames.Capabilities]: [BotOptionItem.id, MessageExtensionItem.id],
    });

    languageAssert({
      platform: Platform.VSCode,
      [CoreQuestionNames.Capabilities]: [
        TabOptionItem.id,
        BotOptionItem.id,
        MessageExtensionItem.id,
      ],
    });

    function languageAssert(inputs: Inputs) {
      if (
        ProgrammingLanguageQuestion.dynamicOptions &&
        ProgrammingLanguageQuestion.placeholder &&
        typeof ProgrammingLanguageQuestion.placeholder === "function"
      ) {
        const options = ProgrammingLanguageQuestion.dynamicOptions(inputs);
        assert.deepEqual(
          [
            { id: "javascript", label: "JavaScript" },
            { id: "typescript", label: "TypeScript" },
          ],
          options
        );
        const placeholder = ProgrammingLanguageQuestion.placeholder(inputs);
        assert.equal("Select a programming language.", placeholder);
      }
    }
  });
  describe("migrateV1", () => {
    afterEach(async () => {
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
          .stub<any, any>(tools.ui, "inputText")
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
          .stub<any, any>(tools.ui, "showMessage")
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

          const projectSettingsResult = await loadProjectSettings(inputs, true);
          if (projectSettingsResult.isErr()) {
            assert.fail("failed to load project settings");
          }
          const projectSettings = projectSettingsResult.value;
          const validSettingsResult = validateSettings(projectSettings);
          assert.isTrue(validSettingsResult === undefined);
        }
      });
    });
  });
});
