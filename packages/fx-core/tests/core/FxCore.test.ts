// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Inputs,
  Platform,
  Stage,
  Ok,
  FxError,
  UserError,
  SystemError,
  err,
  ok,
  Result,
  Void,
  LogProvider,
  Func,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import { FxCore, getUuid } from "../../src";
import * as featureFlags from "../../src/common/featureFlags";
import { validateProjectSettings } from "../../src/common/projectSettingsHelper";
import { environmentManager } from "../../src/core/environment";
import { setTools } from "../../src/core/globalVars";
import { loadProjectSettings } from "../../src/core/middleware/projectSettingsLoader";
import {
  CoreQuestionNames,
  ProgrammingLanguageQuestion,
  ScratchOptionYesVSC,
} from "../../src/core/question";
import {
  BotOptionItem,
  MessageExtensionItem,
  TabOptionItem,
  TabSPFxItem,
} from "../../src/component/constants";
import { deleteFolder, MockTools, randomAppName } from "./utils";
import * as templateActions from "../../src/common/template-utils/templatesActions";
import { UpdateAadAppDriver } from "../../src/component/driver/aad/update";
import "../../src/component/driver/aad/update";
import { envUtil } from "../../src/component/utils/envUtil";
import { YamlParser } from "../../src/component/configManager/parser";
import {
  DriverDefinition,
  DriverInstance,
  ExecutionResult,
  ILifecycle,
  LifecycleName,
  Output,
  UnresolvedPlaceholders,
} from "../../src/component/configManager/interface";
import { DriverContext } from "../../src/component/driver/interface/commonArgs";
import { coordinator } from "../../src/component/coordinator";
import { FxCoreV3Implement } from "../../src/core/FxCoreImplementV3";
import * as coreImplement from "../../src/core/FxCore";
import { MissingEnvInFileUserError } from "../../src/component/driver/aad/error/missingEnvInFileError";
import { pathUtils } from "../../src/component/utils/pathUtils";
import { AddWebPartDriver } from "../../src/component/driver/add/addWebPart";
import { ValidateAppPackageDriver } from "../../src/component/driver/teamsApp/validateAppPackage";
import { CreateAppPackageDriver } from "../../src/component/driver/teamsApp/createAppPackage";
import { ValidateManifestDriver } from "../../src/component/driver/teamsApp/validate";
import { FileNotFoundError } from "../../src/error/common";
import * as collaborator from "../../src/core/collaborator";
import { CollaborationUtil } from "../../src/core/collaborator";

describe("Core basic APIs", () => {
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  let appName = randomAppName();
  let projectPath = path.resolve(os.tmpdir(), appName);
  let mockedEnvRestore: RestoreFn;
  beforeEach(() => {
    setTools(tools);
    sandbox.stub<any, any>(featureFlags, "isPreviewFeaturesEnabled").returns(true);
    sandbox.stub<any, any>(templateActions, "scaffoldFromTemplates").resolves();
  });
  afterEach(async () => {
    sandbox.restore();
    deleteFolder(projectPath);
    mockedEnvRestore();
  });
  describe("create from new", async () => {
    it("CLI with folder input", async () => {
      mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
      appName = randomAppName();
      const core = new FxCore(tools);
      const inputs: Inputs = {
        platform: Platform.CLI,
        [CoreQuestionNames.Folder]: os.tmpdir(),
        [CoreQuestionNames.AppName]: appName,
        [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC().id,
        [CoreQuestionNames.ProgrammingLanguage]: "javascript",
        [CoreQuestionNames.Capabilities]: ["Tab"],
        stage: Stage.create,
      };
      const res = await core.createProject(inputs);
      projectPath = path.resolve(os.tmpdir(), appName);
      assert.isTrue(res.isOk() && res.value === projectPath);
    });

    it("VSCode without customized default root directory", async () => {
      mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
      appName = randomAppName();
      const core = new FxCore(tools);
      const inputs: Inputs = {
        platform: Platform.VSCode,
        [CoreQuestionNames.AppName]: appName,
        [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC().id,
        [CoreQuestionNames.ProgrammingLanguage]: "javascript",
        [CoreQuestionNames.Capabilities]: ["Tab"],
        [CoreQuestionNames.Folder]: os.tmpdir(),
        stage: Stage.create,
      };
      const res = await core.createProject(inputs);
      projectPath = inputs.projectPath!;
      assert.isTrue(res.isOk() && res.value === projectPath);
      const projectSettingsResult = await loadProjectSettings(inputs, true);
      assert.isTrue(projectSettingsResult.isOk());
      if (projectSettingsResult.isOk()) {
        const projectSettings = projectSettingsResult.value;
        const validSettingsResult = validateProjectSettings(projectSettings);
        assert.isTrue(validSettingsResult === undefined);
        assert.isTrue(projectSettings.version === "2.1.0");
      }
    });

    it("VSCode without customized default root directory - new UI", async () => {
      mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
      appName = randomAppName();
      const core = new FxCore(tools);
      const inputs: Inputs = {
        platform: Platform.VSCode,
        [CoreQuestionNames.AppName]: appName,
        [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC().id,
        [CoreQuestionNames.ProgrammingLanguage]: "javascript",
        [CoreQuestionNames.Capabilities]: "Tab",
        [CoreQuestionNames.Folder]: os.tmpdir(),
        stage: Stage.create,
      };
      const res = await core.createProject(inputs);
      projectPath = inputs.projectPath!;
      assert.isTrue(res.isOk() && res.value === projectPath);
      const projectSettingsResult = await loadProjectSettings(inputs, true);
      assert.isTrue(projectSettingsResult.isOk());
      if (projectSettingsResult.isOk()) {
        const projectSettings = projectSettingsResult.value;
        const validSettingsResult = validateProjectSettings(projectSettings);
        assert.isTrue(validSettingsResult === undefined);
        assert.isTrue(projectSettings.version === "2.1.0");
      }
    });
  });

  it("scaffold and createEnv, activateEnv", async () => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
    appName = randomAppName();
    const core = new FxCore(tools);
    const inputs: Inputs = {
      platform: Platform.CLI,
      [CoreQuestionNames.AppName]: appName,
      [CoreQuestionNames.Folder]: os.tmpdir(),
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC().id,
      [CoreQuestionNames.ProgrammingLanguage]: "javascript",
      [CoreQuestionNames.Capabilities]: "Tab",
      stage: Stage.create,
    };
    const createRes = await core.createProject(inputs);
    assert.isTrue(createRes.isOk());
    projectPath = inputs.projectPath!;
    await fs.writeFile(
      path.resolve(projectPath, "templates", "appPackage", "manifest.template.json"),
      "{}"
    );
    const newEnvName = "newEnv";
    const envListResult = await environmentManager.listRemoteEnvConfigs(projectPath);
    if (envListResult.isErr()) {
      assert.fail("failed to list env names");
    }
    assert.isTrue(envListResult.value.length === 1);
    assert.isTrue(envListResult.value[0] === environmentManager.getDefaultEnvName());
    inputs[CoreQuestionNames.NewTargetEnvName] = newEnvName;
    const createEnvRes = await core.createEnv(inputs);
    if (createEnvRes.isErr()) {
      console.error(createEnvRes.error);
    }
    assert.isTrue(createEnvRes.isOk());

    const newEnvListResult = await environmentManager.listRemoteEnvConfigs(projectPath);
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

  it("deploy aad manifest happy path with param", async () => {
    const restore = mockedEnv({
      TEAMSFX_V3: "true",
    });
    try {
      const core = new FxCore(tools);
      const appName = await mockV3Project();
      // sandbox.stub(UpdateAadAppDriver.prototype, "run").resolves(new Ok(new Map()));
      const inputs: Inputs = {
        platform: Platform.VSCode,
        [CoreQuestionNames.AppName]: appName,
        [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC().id,
        [CoreQuestionNames.ProgrammingLanguage]: "javascript",
        [CoreQuestionNames.Capabilities]: ["Tab", "TabSSO"],
        [CoreQuestionNames.Folder]: os.tmpdir(),
        [CoreQuestionNames.AadAppManifestFilePath]: path.join(
          os.tmpdir(),
          appName,
          "aad.manifest.json"
        ),
        [CoreQuestionNames.TargetEnvName]: "dev",
        stage: Stage.deployAad,
        projectPath: path.join(os.tmpdir(), appName),
      };

      const runSpy = sandbox.spy(UpdateAadAppDriver.prototype, "run");
      await core.deployAadManifest(inputs);
      sandbox.assert.calledOnce(runSpy);
      assert.isNotNull(runSpy.getCall(0).args[0]);
      assert.strictEqual(
        runSpy.getCall(0).args[0].manifestPath,
        path.join(os.tmpdir(), appName, "aad.manifest.json")
      );
      runSpy.restore();
    } finally {
      restore();
    }
  });

  it("add web part to SPFx", async () => {
    const restore = mockedEnv({
      TEAMSFX_V3: "true",
    });
    try {
      const core = new FxCore(tools);
      const appName = await mockV3Project();
      const appPath = path.join(os.tmpdir(), appName);
      const inputs: Inputs = {
        platform: Platform.VSCode,
        [CoreQuestionNames.Folder]: os.tmpdir(),
        "spfx-folder": ".\\src",
        "manifest-path": path.join(appPath, "appPackage\\manifest.json"),
        "local-manifest-path": path.join(appPath, "appPackage\\manifest.local.json"),
        "spfx-webpart-name": "helloworld",
        "spfx-install-latest-package": "true",
        "spfx-load-package-version": "loaded",
        stage: Stage.addWebpart,
        projectPath: appPath,
      };

      const runSpy = sandbox.spy(AddWebPartDriver.prototype, "run");
      await core.addWebpart(inputs);
      sandbox.assert.calledOnce(runSpy);
      runSpy.restore();
    } finally {
      restore();
    }
  });

  it("deploy aad manifest happy path", async () => {
    const restore = mockedEnv({
      TEAMSFX_V3: "true",
    });
    try {
      const core = new FxCore(tools);
      const appName = await mockV3Project();
      sandbox.stub(UpdateAadAppDriver.prototype, "run").resolves(new Ok(new Map()));
      const inputs: Inputs = {
        platform: Platform.VSCode,
        [CoreQuestionNames.AppName]: appName,
        [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC().id,
        [CoreQuestionNames.ProgrammingLanguage]: "javascript",
        [CoreQuestionNames.Capabilities]: ["Tab", "TabSSO"],
        [CoreQuestionNames.Folder]: os.tmpdir(),
        [CoreQuestionNames.AadAppManifestFilePath]: path.join(
          os.tmpdir(),
          appName,
          "aad.manifest.json"
        ),
        env: "dev",
        stage: Stage.deployAad,
        projectPath: path.join(os.tmpdir(), appName),
      };
      const res = await core.deployAadManifest(inputs);
      assert.isTrue(await fs.pathExists(path.join(os.tmpdir(), appName, "build")));
      await deleteTestProject(appName);
      assert.isTrue(res.isOk());
    } finally {
      restore();
    }
  });

  it("deploy aad manifest return err", async () => {
    const restore = mockedEnv({
      TEAMSFX_V3: "true",
    });
    try {
      const core = new FxCore(tools);
      const appName = await mockV3Project();
      const appManifestPath = path.join(os.tmpdir(), appName, "aad.manifest.json");
      sandbox.stub(environmentManager, "listAllEnvConfigs").resolves(ok(["dev", "local"]));
      const inputs: Inputs = {
        platform: Platform.VSCode,
        [CoreQuestionNames.AppName]: appName,
        [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC().id,
        [CoreQuestionNames.ProgrammingLanguage]: "javascript",
        [CoreQuestionNames.Capabilities]: ["Tab", "TabSSO"],
        [CoreQuestionNames.Folder]: os.tmpdir(),
        [CoreQuestionNames.AadAppManifestFilePath]: appManifestPath,
        env: "dev",
        stage: Stage.deployAad,
        projectPath: path.join(os.tmpdir(), appName),
      };
      sandbox
        .stub(UpdateAadAppDriver.prototype, "run")
        .throws(new UserError("error name", "fake_error", "fake_err_msg"));
      const errMsg = `AAD manifest doesn't exist in ${appManifestPath}, please use the CLI to specify an AAD manifest to deploy.`;
      const res = await core.deployAadManifest(inputs);
      assert.isTrue(res.isErr());
      if (res.isErr()) {
        assert.strictEqual(res.error.message, "fake_err_msg");
      }
    } finally {
      restore();
    }
  });

  it("deploy aad manifest with missing env err", async () => {
    const restore = mockedEnv({
      TEAMSFX_V3: "true",
    });
    try {
      const core = new FxCore(tools);
      const appName = await mockV3Project();
      const appManifestPath = path.join(os.tmpdir(), appName, "aad.manifest.json");
      sandbox.stub(environmentManager, "listAllEnvConfigs").resolves(ok([""]));
      const inputs: Inputs = {
        platform: Platform.VSCode,
        [CoreQuestionNames.AppName]: appName,
        [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC().id,
        [CoreQuestionNames.ProgrammingLanguage]: "javascript",
        [CoreQuestionNames.Capabilities]: ["Tab", "TabSSO"],
        [CoreQuestionNames.Folder]: os.tmpdir(),
        [CoreQuestionNames.AadAppManifestFilePath]: appManifestPath,
        env: undefined,
        stage: Stage.deployAad,
        projectPath: path.join(os.tmpdir(), appName),
      };
      sandbox
        .stub(UpdateAadAppDriver.prototype, "run")
        .resolves(
          err(
            new MissingEnvInFileUserError(
              "aadApp/update",
              "AAD_APP_OBJECT_ID",
              "https://fake-help-link",
              "driver.aadApp.error.generateManifestFailed",
              "fake path"
            )
          )
        );
      const res = await core.deployAadManifest(inputs);
      assert.isTrue(res.isErr());
      if (res.isErr()) {
        assert.strictEqual(
          res.error.message,
          "Unable to generate Azure Active Directory app manifest. Environment variable AAD_APP_OBJECT_ID referenced in fake path has no value. If you are developing with a new project created with Teams Toolkit, running provision or debug will register correct values for these environment variables."
        );
      }
    } finally {
      restore();
    }
  });

  it("deploy aad manifest not exist", async () => {
    const restore = mockedEnv({
      TEAMSFX_V3: "true",
    });
    try {
      const core = new FxCore(tools);
      const appName = await mockV3Project();
      const appManifestPath = path.join(os.tmpdir(), appName, "aad.manifest.json");
      await fs.remove(appManifestPath);
      const inputs: Inputs = {
        platform: Platform.VSCode,
        [CoreQuestionNames.AppName]: appName,
        [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC().id,
        [CoreQuestionNames.ProgrammingLanguage]: "javascript",
        [CoreQuestionNames.Capabilities]: ["Tab", "TabSSO"],
        [CoreQuestionNames.Folder]: os.tmpdir(),
        [CoreQuestionNames.AadAppManifestFilePath]: path.join(
          os.tmpdir(),
          appName,
          "aad.manifest.json"
        ),
        env: "dev",
        stage: Stage.deployAad,
        projectPath: path.join(os.tmpdir(), appName),
      };
      const res = await core.deployAadManifest(inputs);
      assert.isTrue(res.isErr());
      if (res.isErr()) {
        assert.isTrue(res.error instanceof FileNotFoundError);
      }
      await deleteTestProject(appName);
    } finally {
      restore();
    }
  });

  it("phantomMigrationV3 happy path", async () => {
    const restore = mockedEnv({
      TEAMSFX_V3: "true",
    });
    try {
      const core = new FxCore(tools);
      const appName = await mockV3Project();
      const inputs: Inputs = {
        platform: Platform.VSCode,
        projectPath: path.join(os.tmpdir(), appName),
      };
      const res = await core.phantomMigrationV3(inputs);
      assert.isTrue(res.isOk());
      await deleteTestProject(appName);
    } finally {
      restore();
    }
  });

  it("permission v3", async () => {
    const restore = mockedEnv({
      TEAMSFX_V3: "true",
    });
    try {
      let res;
      const core = new FxCore(tools);
      const appName = await mockV3Project();
      const inputs: Inputs = {
        platform: Platform.VSCode,
        [CoreQuestionNames.AppName]: appName,
        [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC().id,
        [CoreQuestionNames.ProgrammingLanguage]: "javascript",
        [CoreQuestionNames.Capabilities]: ["Tab", "TabSSO"],
        [CoreQuestionNames.Folder]: os.tmpdir(),
        stage: Stage.listCollaborator,
        projectPath: path.join(os.tmpdir(), appName),
      };
      sandbox.stub(collaborator, "getQuestionsForGrantPermission").resolves(ok(undefined));
      sandbox.stub(collaborator, "getQuestionsForListCollaborator").resolves(ok(undefined));
      sandbox.stub(coreImplement, "listCollaboratorFunc").resolves(ok(undefined));
      sandbox.stub(coreImplement, "checkPermissionFunc").resolves(ok(undefined));
      sandbox.stub(coreImplement, "grantPermissionFunc").resolves(ok(undefined));
      res = await core.listCollaborator(inputs);
      assert.isTrue(res.isOk());
      res = await core.checkPermission(inputs);
      assert.isTrue(res.isOk());
      res = await core.grantPermission(inputs);
      assert.isTrue(res.isOk());
    } finally {
      restore();
    }
  });

  it("permission v2", async () => {
    const restore = mockedEnv({
      TEAMSFX_V3: "false",
    });
    try {
      let res;
      const core = new FxCore(tools);
      const appName = await mockV2Project();
      const inputs: Inputs = {
        platform: Platform.VSCode,
        [CoreQuestionNames.AppName]: appName,
        [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC().id,
        [CoreQuestionNames.ProgrammingLanguage]: "javascript",
        [CoreQuestionNames.Capabilities]: ["Tab", "TabSSO"],
        [CoreQuestionNames.Folder]: os.tmpdir(),
        stage: Stage.listCollaborator,
        projectPath: path.join(os.tmpdir(), appName),
      };
      sandbox.stub(collaborator, "getQuestionsForGrantPermission").resolves(ok(undefined));
      sandbox.stub(collaborator, "getQuestionsForListCollaborator").resolves(ok(undefined));
      sandbox.stub(coreImplement, "listCollaboratorFunc").resolves(ok(undefined));
      sandbox.stub(coreImplement, "checkPermissionFunc").resolves(ok(undefined));
      sandbox.stub(coreImplement, "grantPermissionFunc").resolves(ok(undefined));
      sandbox.stub(CollaborationUtil, "getUserInfo").resolves({
        tenantId: "fake_tid",
        aadId: "fake_oid",
        userPrincipalName: "fake_unique_name",
        displayName: "displayName",
        isAdministrator: true,
      });

      res = await core.listCollaborator(inputs);
      assert.isTrue(res.isOk());
      res = await core.checkPermission(inputs);
      assert.isTrue(res.isOk());
      res = await core.grantPermission(inputs);
      assert.isTrue(res.isOk());
    } finally {
      restore();
    }
  });

  it("not implement method", async () => {
    const implement = new FxCoreV3Implement(tools);
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: path.join(os.tmpdir(), appName, "samples-v3"),
    };
    try {
      const noImplemtnMethod = async (inputs: Inputs) => {
        return "";
      };
      await implement.dispatch(noImplemtnMethod, inputs);
      assert.fail("v3 dispatch matched no implemented method");
    } catch (error) {
      assert.isNotNull(error);
    }

    try {
      const mockFunc = {
        namespace: "mock namespace",
        method: "mock func",
      };
      const noImplemtnMethod = async (func: Func, inputs: Inputs) => {
        return "";
      };
      await implement.dispatchUserTask(noImplemtnMethod, mockFunc, inputs);
      assert.fail("v3 dispatchUserTask matched no implemented method");
    } catch (error) {
      assert.isNotNull(error);
    }
  });

  it("buildAadManifest method should exist", async () => {
    const restore = mockedEnv({
      TEAMSFX_V3: "true",
      TEAMSFX_DEBUG_TEMPLATE: "true", // workaround test failure that when local template not released to GitHub
      NODE_ENV: "development", // workaround test failure that when local template not released to GitHub
      AAD_APP_OBJECT_ID: getUuid(),
      AAD_APP_CLIENT_ID: getUuid(),
      TAB_DOMAIN: "fake",
      TAB_ENDPOINT: "fake",
    });
    try {
      sandbox.stub(envUtil, "readEnv").resolves(
        ok({
          AAD_APP_OBJECT_ID: getUuid(),
          AAD_APP_CLIENT_ID: getUuid(),
          TAB_DOMAIN: "fake",
          TAB_ENDPOINT: "fake",
        })
      );
      const appName = randomAppName();
      const core = new FxCore(tools);
      const inputs: Inputs = {
        platform: Platform.VSCode,
        [CoreQuestionNames.AppName]: appName,
        [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC().id,
        [CoreQuestionNames.ProgrammingLanguage]: "javascript",
        [CoreQuestionNames.Capabilities]: ["Tab"],
        [CoreQuestionNames.Folder]: os.tmpdir(),
        stage: Stage.create,
        projectPath: path.join(os.tmpdir(), appName, "samples-v3"),
      };
      const res = await core.createProject(inputs);
      projectPath = inputs.projectPath!;
      assert.isTrue(res.isOk() && res.value === projectPath);

      const implement = new FxCoreV3Implement(tools);

      const mockFunc = {
        namespace: "mock namespace",
        method: "buildAadManifest",
      };

      const result = await implement.executeUserTask(mockFunc, inputs);
      assert.isTrue(result.isOk());
    } finally {
      restore();
    }
  });

  it("addSso method should exist", async () => {
    const restore = mockedEnv({
      TEAMSFX_V3: "true",
      TEAMSFX_DEBUG_TEMPLATE: "true", // workaround test failures when template changed but not release to GitHub alpha template
      NODE_ENV: "development", // workaround test failures when template changed but not release to GitHub alpha template
    });
    try {
      const appName = randomAppName();
      const core = new FxCore(tools);
      const inputs: Inputs = {
        platform: Platform.VSCode,
        [CoreQuestionNames.AppName]: appName,
        [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC().id,
        [CoreQuestionNames.ProgrammingLanguage]: "javascript",
        [CoreQuestionNames.Capabilities]: ["Tab"],
        [CoreQuestionNames.Folder]: os.tmpdir(),
        stage: Stage.create,
        projectPath: path.join(os.tmpdir(), appName, "samples-v3"),
      };
      const res = await core.createProject(inputs);
      projectPath = inputs.projectPath!;
      assert.isTrue(res.isOk() && res.value === projectPath);

      const implement = new FxCoreV3Implement(tools);

      const mockFunc = {
        namespace: "mock namespace",
        method: "addSso",
      };

      const result = await implement.executeUserTask(mockFunc, inputs);
      assert.isTrue(result.isOk());
    } finally {
      restore();
    }
  });

  it("ProgrammingLanguageQuestion", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      [CoreQuestionNames.Capabilities]: TabSPFxItem().id,
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
      [CoreQuestionNames.Capabilities]: TabOptionItem().id,
    });
    languageAssert({
      platform: Platform.VSCode,
      [CoreQuestionNames.Capabilities]: BotOptionItem().id,
    });
    languageAssert({
      platform: Platform.VSCode,
      [CoreQuestionNames.Capabilities]: MessageExtensionItem().id,
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
});

describe("apply yaml template", async () => {
  const tools = new MockTools();
  beforeEach(() => {
    setTools(tools);
  });
  describe("when run with missing input", async () => {
    it("should return error when projectPath is undefined", async () => {
      const core = new FxCore(tools);
      const inputs: Inputs = {
        platform: Platform.CLI,
        projectPath: undefined,
      };
      const res = await core.apply(inputs, "", "provision");
      assert.isTrue(
        res.isErr() &&
          res.error.name === "InvalidInput" &&
          res.error.message.includes("projectPath")
      );
    });

    it("should return error when env is undefined", async () => {
      const core = new FxCore(tools);
      const inputs: Inputs = {
        platform: Platform.CLI,
        projectPath: "./",
        env: undefined,
      };
      const res = await core.apply(inputs, "", "provision");
      assert.isTrue(
        res.isErr() && res.error.name === "InvalidInput" && res.error.message.includes("env")
      );
    });
  });

  describe("when readEnv returns error", async () => {
    const sandbox = sinon.createSandbox();

    const mockedError = new SystemError("mockedSource", "mockedError", "mockedMessage");

    before(() => {
      sandbox.stub(envUtil, "readEnv").resolves(err(mockedError));
    });

    after(() => {
      sandbox.restore();
    });

    it("should return error too", async () => {
      const core = new FxCore(tools);
      const inputs: Inputs = {
        platform: Platform.CLI,
        projectPath: "./",
        env: "dev",
      };
      const res = await core.apply(inputs, "./", "provision");
      assert.isTrue(res.isErr() && res.error.name === "mockedError");
    });
  });

  describe("when YamlParser returns error", async () => {
    const sandbox = sinon.createSandbox();

    const mockedError = new SystemError("mockedSource", "mockedError", "mockedMessage");

    before(() => {
      sandbox.stub(envUtil, "readEnv").resolves(ok({}));
      sandbox.stub(YamlParser.prototype, "parse").resolves(err(mockedError));
    });

    after(() => {
      sandbox.restore();
    });

    it("should return error too", async () => {
      const core = new FxCore(tools);
      const inputs: Inputs = {
        platform: Platform.CLI,
        projectPath: "./",
        env: "dev",
      };
      const res = await core.apply(inputs, "./", "provision");
      assert.isTrue(res.isErr() && res.error.name === "mockedError");
    });
  });

  describe("when running against an empty yaml file", async () => {
    const sandbox = sinon.createSandbox();

    before(() => {
      sandbox.stub(envUtil, "readEnv").resolves(ok({}));
      sandbox.stub(YamlParser.prototype, "parse").resolves(ok({}));
    });

    after(() => {
      sandbox.restore();
    });

    it("should return ok", async () => {
      const core = new FxCore(tools);
      const inputs: Inputs = {
        platform: Platform.CLI,
        projectPath: "./",
        env: "dev",
      };
      const res = await core.apply(inputs, "./", "provision");
      assert.isTrue(res.isOk());
    });
  });

  describe("when lifecycle returns error", async () => {
    const sandbox = sinon.createSandbox();
    const mockedError = new SystemError("mockedSource", "mockedError", "mockedMessage");

    class MockedProvision implements ILifecycle {
      name: LifecycleName = "provision";
      driverDefs: DriverDefinition[] = [];
      public async run(ctx: DriverContext): Promise<Result<Output, FxError>> {
        return err(mockedError);
      }

      public resolvePlaceholders(): UnresolvedPlaceholders {
        return [];
      }

      public async execute(ctx: DriverContext): Promise<ExecutionResult> {
        return {
          result: err({
            kind: "Failure",
            error: mockedError,
          }),
          summaries: [],
        };
      }

      public resolveDriverInstances(log: LogProvider): Result<DriverInstance[], FxError> {
        return ok([]);
      }
    }

    before(() => {
      sandbox.stub(envUtil, "readEnv").resolves(ok({}));
      sandbox.stub(YamlParser.prototype, "parse").resolves(
        ok({
          provision: new MockedProvision(),
        })
      );
    });

    after(() => {
      sandbox.restore();
    });

    it("should return error", async () => {
      const core = new FxCore(tools);
      const inputs: Inputs = {
        platform: Platform.CLI,
        projectPath: "./",
        env: "dev",
      };
      const res = await core.apply(inputs, "./", "provision");
      assert.isTrue(res.isErr() && res.error.name === "mockedError");
    });
  });
});

async function mockV3Project(): Promise<string> {
  const appName = randomAppName();
  const projectPath = path.join(os.tmpdir(), appName);
  // await fs.move(path.join(__dirname, "../sampleV3"), path.join(os.tmpdir(), appName));
  await fs.copy(path.join(__dirname, "../samples/sampleV3/"), path.join(projectPath));
  return appName;
}

async function mockV2Project(): Promise<string> {
  const appName = randomAppName();
  const projectPath = path.join(os.tmpdir(), appName);
  await fs.copy(
    path.join(__dirname, "../core/middleware/testAssets/v3Migration/happyPath"),
    path.join(projectPath)
  );
  return appName;
}

async function deleteTestProject(appName: string) {
  await fs.remove(path.join(os.tmpdir(), appName));
}

describe("createEnvCopyV3", async () => {
  const tools = new MockTools();
  const sandbox = sinon.createSandbox();
  const sourceEnvContent = [
    "# this is a comment",
    "TEAMSFX_ENV=dev",
    "",
    "_KEY1=value1",
    "KEY2=value2",
    "SECRET_KEY3=xxxx",
  ];
  const sourceEnvStr = sourceEnvContent.join(os.EOL);

  const writeStreamContent: string[] = [];
  // fs.WriteStream's full interface is too hard to mock. We only use write() and end() so we just mock them here.
  class MockedWriteStream {
    write(chunk: any, callback?: ((error: Error | null | undefined) => void) | undefined): boolean {
      writeStreamContent.push(chunk);
      return true;
    }
    end(): boolean {
      return true;
    }
  }

  beforeEach(() => {
    sandbox.stub(fs, "readFile").resolves(Buffer.from(sourceEnvStr, "utf8"));
    sandbox.stub<any, any>(fs, "createWriteStream").returns(new MockedWriteStream());
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should create new .env file with desired content", async () => {
    sandbox.stub(pathUtils, "getEnvFilePath").resolves(ok("./env/.env.dev"));
    const core = new FxCore(tools);
    const res = await core.v3Implement.createEnvCopyV3("newEnv", "dev", "./");
    assert(res.isOk());
    assert(
      writeStreamContent[0] === `${sourceEnvContent[0]}${os.EOL}`,
      "comments should be copied"
    );
    assert(
      writeStreamContent[1] === `TEAMSFX_ENV=newEnv${os.EOL}`,
      "TEAMSFX_ENV's value should be new env name"
    );
    assert(writeStreamContent[2] === `${os.EOL}`, "empty line should be coped");
    assert(
      writeStreamContent[3] === `_KEY1=${os.EOL}`,
      "key starts with _ should be copied with empty value"
    );
    assert(
      writeStreamContent[4] === `KEY2=${os.EOL}`,
      "key not starts with _ should be copied with empty value"
    );
    assert(
      writeStreamContent[5] === `SECRET_KEY3=${os.EOL}`,
      "key not starts with SECRET_ should be copied with empty value"
    );
  });

  it("should failed case 1", async () => {
    sandbox
      .stub(pathUtils, "getEnvFilePath")
      .onFirstCall()
      .resolves(err(new UserError({})));
    const core = new FxCore(tools);
    const res = await core.v3Implement.createEnvCopyV3("newEnv", "dev", "./");
    assert(res.isErr());
  });

  it("should failed case 2", async () => {
    sandbox
      .stub(pathUtils, "getEnvFilePath")
      .onFirstCall()
      .resolves(ok("./env"))
      .onSecondCall()
      .resolves(err(new UserError({})));
    const core = new FxCore(tools);
    const res = await core.v3Implement.createEnvCopyV3("newEnv", "dev", "./");
    assert(res.isErr());
  });
});

describe("publishInDeveloperPortal", () => {
  const tools = new MockTools();
  const sandbox = sinon.createSandbox();

  before(() => {
    sandbox.stub(envUtil, "readEnv").resolves(ok({}));
  });
  afterEach(() => {
    sandbox.restore();
  });

  it("success", async () => {
    const core = new FxCore(tools);
    const inputs: Inputs = {
      env: "local",
      projectPath: "project-path",
      platform: Platform.VSCode,
      [CoreQuestionNames.AppPackagePath]: "path",
      ignoreLockByUT: true,
    };
    sandbox.stub(fs, "pathExists").resolves(false);
    sandbox.stub(coordinator, "publishInDeveloperPortal").resolves(ok(Void));
    const res = await core.publishInDeveloperPortal(inputs);

    if (res.isErr()) {
      console.log(res.error);
    }
    assert.isTrue(res.isOk());
  });
});

describe("Teams app APIs", async () => {
  const tools = new MockTools();
  const core = new FxCore(tools);

  afterEach(() => {
    sinon.restore();
  });

  it("validate app package", async () => {
    const appName = await mockV3Project();
    const inputs: Inputs = {
      platform: Platform.VSCode,
      [CoreQuestionNames.Folder]: os.tmpdir(),
      [CoreQuestionNames.TeamsAppPackageFilePath]: ".\\build\\appPackage\\appPackage.dev.zip",
      validateMethod: "validateAgainstAppPackage",
      projectPath: path.join(os.tmpdir(), appName),
    };

    const runSpy = sinon.spy(ValidateAppPackageDriver.prototype, "run");
    await core.validateApplication(inputs);
    sinon.assert.calledOnce(runSpy);
  });

  it("validate manifest", async () => {
    const appName = await mockV3Project();
    const restore = mockedEnv({
      TEAMSFX_V3: "true",
    });
    const inputs: Inputs = {
      platform: Platform.VSCode,
      [CoreQuestionNames.Folder]: os.tmpdir(),
      [CoreQuestionNames.TeamsAppManifestFilePath]: ".\\appPackage\\manifest.json",
      validateMethod: "validateAgainstSchema",
      projectPath: path.join(os.tmpdir(), appName),
    };

    try {
      const runSpy = sinon.spy(ValidateManifestDriver.prototype, "run");
      await core.validateApplication(inputs);
      sinon.assert.calledOnce(runSpy);
    } finally {
      restore();
    }
  });

  it("create app package", async () => {
    setTools(tools);
    const appName = await mockV3Project();
    const inputs: Inputs = {
      platform: Platform.VSCode,
      [CoreQuestionNames.Folder]: os.tmpdir(),
      [CoreQuestionNames.TeamsAppManifestFilePath]: ".\\appPackage\\manifest.json",
      projectPath: path.join(os.tmpdir(), appName),
      [CoreQuestionNames.OutputZipPathParamName]: ".\\build\\appPackage\\appPackage.dev.zip",
    };

    sinon.stub(process, "platform").value("win32");
    const runStub = sinon.stub(CreateAppPackageDriver.prototype, "run").resolves(ok(new Map()));
    const showMessageStub = sinon.stub(tools.ui, "showMessage");
    await core.createAppPackage(inputs);
    sinon.assert.calledOnce(runStub);
    sinon.assert.calledOnce(showMessageStub);
  });

  it("publish application", async () => {
    const appName = await mockV3Project();
    const inputs: Inputs = {
      platform: Platform.VSCode,
      [CoreQuestionNames.Folder]: os.tmpdir(),
      projectPath: path.join(os.tmpdir(), appName),
    };

    sinon
      .stub(coordinator, "publish")
      .resolves(err(new SystemError("mockedSource", "mockedError", "mockedMessage")));
    await core.publishApplication(inputs);
  });
});
