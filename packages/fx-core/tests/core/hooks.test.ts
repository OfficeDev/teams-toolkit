// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks, NextFunction } from "@feathersjs/hooks/lib";
import {
  AppPackageFolderName,
  ArchiveFolderName,
  ConfigFolderName,
  CryptoProvider,
  EnvConfig,
  EnvInfo,
  EnvNamePlaceholder,
  EnvStateFileNameTemplate,
  Err,
  err,
  FxError,
  InputConfigsFolderName,
  Inputs,
  Json,
  Ok,
  ok,
  Platform,
  ProjectSettingsFileName,
  Result,
  SingleSelectConfig,
  SingleSelectResult,
  SolutionContext,
  Stage,
  StatesFolderName,
  Tools,
  UserCancelError,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import { Container } from "typedi";
import { CoreHookContext, serializeDict } from "../../src";
import * as commonTools from "../../src/common/tools";
import { environmentManager } from "../../src/core/environment";
import { EnvInfoLoaderMW } from "../../src/core/middleware/envInfoLoader";
import { MigrateConditionHandlerMW } from "../../src/core/middleware/migrateConditionHandler";
import {
  migrateArm,
  ProjectMigratorMW,
  ArmParameters,
} from "../../src/core/middleware/projectMigrator";
import { ProjectUpgraderMW } from "../../src/core/middleware/projectUpgrader";
import { SolutionPlugins } from "../../src/core/SolutionPluginContainer";
import {
  MockLatestVersion2_3_0Context,
  MockLatestVersion2_3_0UserData,
  MockPreviousVersionBefore2_3_0Context,
  MockPreviousVersionBefore2_3_0UserData,
  MockProjectSettings,
  MockSolution,
  MockTools,
  MockUserInteraction,
  randomAppName,
} from "./utils";
import * as dotenv from "dotenv";
let mockedEnvRestore: () => void;
describe("Middleware - others", () => {
  const sandbox = sinon.createSandbox();
  const mockSolution = new MockSolution();

  beforeEach(() => {
    Container.set(SolutionPlugins.AzureTeamsSolution, mockSolution);
  });
  afterEach(() => {
    sandbox.restore();
  });

  describe("ProjectUpgraderMW", () => {
    const sandbox = sinon.createSandbox();
    const appName = randomAppName();
    const projectSettings = MockProjectSettings(appName);
    let envJson: Json = {};
    let userData: Record<string, string> = {};

    const inputs: Inputs = { platform: Platform.VSCode };
    inputs.projectPath = path.join(os.tmpdir(), appName);
    const envName = environmentManager.getDefaultEnvName();
    const confFolderPath = path.resolve(
      inputs.projectPath,
      commonTools.isMultiEnvEnabled()
        ? path.resolve(`.${ConfigFolderName}`, InputConfigsFolderName)
        : `.${ConfigFolderName}`
    );
    const statesFolderPath = path.resolve(
      inputs.projectPath,
      `.${ConfigFolderName}`,
      StatesFolderName
    );
    const settingsFile = path.resolve(
      confFolderPath,
      commonTools.isMultiEnvEnabled() ? ProjectSettingsFileName : "settings.json"
    );
    const envJsonFile = commonTools.isMultiEnvEnabled()
      ? path.resolve(
          statesFolderPath,
          EnvStateFileNameTemplate.replace(EnvNamePlaceholder, envName)
        )
      : path.resolve(confFolderPath, `env.${envName}.json`);
    const userDataFile = commonTools.isMultiEnvEnabled()
      ? path.resolve(statesFolderPath, `${envName}.userdata`)
      : path.resolve(confFolderPath, `${envName}.userdata`);

    function MockFunctions() {
      sandbox.stub<any, any>(fs, "readJson").callsFake(async (file: string) => {
        if (settingsFile === file) return projectSettings;
        if (envJsonFile === file) return envJson;
        return {};
      });
      sandbox.stub<any, any>(fs, "writeFile").callsFake(async (file: string, content: any) => {
        if (userDataFile === file) {
          userData = dotenv.parse(content);
        }
        if (envJsonFile === file) {
          envJson = JSON.parse(content);
        }
      });
      sandbox.stub<any, any>(fs, "readFile").callsFake(async (file: string) => {
        if (userDataFile === file) return serializeDict(userData);
        return {};
      });
      sandbox.stub<any, any>(fs, "stat").callsFake(async (file: string) => {
        if ([settingsFile, envJsonFile, userDataFile].includes(file)) {
          return {};
        } else {
          throw new Error("file not found");
        }
      });
    }

    beforeEach(() => {
      sandbox.stub<any, any>(fs, "pathExists").callsFake(async (file: string) => {
        if (userDataFile === file) return true;
        if (inputs.projectPath === file) return true;
        return {};
      });
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("Previous context and userdata", async () => {
      envJson = MockPreviousVersionBefore2_3_0Context();
      userData = MockPreviousVersionBefore2_3_0UserData();
      MockFunctions();

      class ProjectUpgradeHook {
        tools = new MockTools();

        async upgrade(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
          assert.equal(userData["fx-resource-aad-app-for-teams.local_clientId"], "local_clientId");
          assert.equal(userData["solution.localDebugTeamsAppId"], "teamsAppId");
          assert.equal(
            (envJson["solution"] as any)["localDebugTeamsAppId"],
            "{{solution.localDebugTeamsAppId}}"
          );
          assert.equal(
            (envJson["fx-resource-aad-app-for-teams"] as any)["local_clientId"],
            "{{fx-resource-aad-app-for-teams.local_clientId}}"
          );
          return ok("");
        }
      }

      hooks(ProjectUpgradeHook, {
        upgrade: [ProjectUpgraderMW],
      });

      const my = new ProjectUpgradeHook();
      const res = await my.upgrade(inputs);
      assert.isTrue(res.isOk() && res.value === "");
    });

    it("Previous context and new userdata", async () => {
      envJson = MockPreviousVersionBefore2_3_0Context();
      userData = MockLatestVersion2_3_0UserData();
      MockFunctions();

      class ProjectUpgradeHook {
        tools = new MockTools();

        async upgrade(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
          assert.equal(
            userData["fx-resource-aad-app-for-teams.local_clientId"],
            "local_clientId_new"
          );
          assert.equal(userData["solution.localDebugTeamsAppId"], "teamsAppId_new");
          assert.equal(
            (envJson["solution"] as any)["localDebugTeamsAppId"],
            "{{solution.localDebugTeamsAppId}}"
          );
          assert.equal(
            (envJson["fx-resource-aad-app-for-teams"] as any)["local_clientId"],
            "{{fx-resource-aad-app-for-teams.local_clientId}}"
          );
          return ok("");
        }
      }

      hooks(ProjectUpgradeHook, {
        upgrade: [ProjectUpgraderMW],
      });

      const my = new ProjectUpgradeHook();
      const res = await my.upgrade(inputs);
      assert.isTrue(res.isOk() && res.value === "");
    });

    it("New context and previous userdata", async () => {
      envJson = MockLatestVersion2_3_0Context();
      userData = MockPreviousVersionBefore2_3_0UserData();
      MockFunctions();

      class ProjectUpgradeHook {
        tools = new MockTools();

        async upgrade(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
          assert.equal(userData["fx-resource-aad-app-for-teams.local_clientId"], undefined);
          assert.equal(userData["solution.localDebugTeamsAppId"], undefined);
          assert.equal(
            (envJson["solution"] as any)["localDebugTeamsAppId"],
            "{{solution.localDebugTeamsAppId}}"
          );
          assert.equal(
            (envJson["fx-resource-aad-app-for-teams"] as any)["local_clientId"],
            "{{fx-resource-aad-app-for-teams.local_clientId}}"
          );
          return ok("");
        }
      }

      hooks(ProjectUpgradeHook, {
        upgrade: [ProjectUpgraderMW],
      });

      const my = new ProjectUpgradeHook();
      const res = await my.upgrade(inputs);
      assert.isTrue(res.isOk() && res.value === "");
    });

    it("Previous context and userdata without secret", async () => {
      envJson = MockPreviousVersionBefore2_3_0Context();
      userData = {};
      MockFunctions();

      class ProjectUpgradeHook {
        name = "jay";
        tools = new MockTools();

        async upgrade(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
          assert.equal(userData["fx-resource-aad-app-for-teams.local_clientId"], undefined);
          assert.equal(userData["solution.localDebugTeamsAppId"], undefined);
          assert.equal(
            (envJson["solution"] as any)["localDebugTeamsAppId"],
            "{{solution.localDebugTeamsAppId}}"
          );
          assert.equal(
            (envJson["fx-resource-aad-app-for-teams"] as any)["local_clientId"],
            "{{fx-resource-aad-app-for-teams.local_clientId}}"
          );
          return ok("");
        }
      }

      hooks(ProjectUpgradeHook, {
        upgrade: [ProjectUpgraderMW],
      });

      const my = new ProjectUpgradeHook();
      const res = await my.upgrade(inputs);
      assert.isTrue(res.isOk() && res.value === "");
    });

    it("Should not upgrade for the new multi env project", async () => {
      sandbox.stub(process, "env").get(() => {
        return { __TEAMSFX_INSIDER_PREVIEW: "true" };
      });

      envJson = MockLatestVersion2_3_0Context();
      userData = MockLatestVersion2_3_0UserData();
      MockFunctions();

      class ProjectUpgradeHook {
        name = "jay";
        tools = new MockTools();

        async upgrade(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
          assert.equal(
            userData["fx-resource-aad-app-for-teams.local_clientId"],
            "local_clientId_new"
          );
          assert.equal(userData["solution.localDebugTeamsAppId"], "teamsAppId_new");
          assert.equal(
            (envJson["solution"] as any)["localDebugTeamsAppId"],
            "{{solution.localDebugTeamsAppId}}"
          );
          assert.equal(
            (envJson["fx-resource-aad-app-for-teams"] as any)["local_clientId"],
            "{{fx-resource-aad-app-for-teams.local_clientId}}"
          );
          return ok("");
        }
      }

      hooks(ProjectUpgradeHook, {
        upgrade: [ProjectUpgraderMW],
      });

      const my = new ProjectUpgradeHook();
      const res = await my.upgrade(inputs);
      assert.isTrue(res.isOk() && res.value === "");
    });
  });

  describe("MigrateConditionHandlerMW", () => {
    it("Happy ", async () => {
      class MyClass {
        tools?: any = new MockTools();

        async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
          return ok("");
        }
      }

      hooks(MyClass, {
        myMethod: [MigrateConditionHandlerMW],
      });
      const my = new MyClass();
      const inputs: Inputs = { platform: Platform.VSCode };
      inputs.projectPath = path.join(os.tmpdir(), randomAppName());
      try {
        await fs.ensureDir(inputs.projectPath);
        await fs.writeJSON(path.join(inputs.projectPath, "package.json"), { msteams: {} });
        const appPackagePath = path.join(inputs.projectPath, AppPackageFolderName);
        await fs.ensureDir(appPackagePath);
        await fs.writeJSON(path.join(appPackagePath, "manifest.json"), {});

        await fs.ensureDir(path.join(inputs.projectPath, `.${ConfigFolderName}`));

        const res = await my.myMethod(inputs);
        assert.isTrue(res.isErr());
      } finally {
        await fs.rmdir(inputs.projectPath!, { recursive: true });
      }
    });

    it("Failed to migrate if no project is opened", async () => {
      class MyClass {
        tools?: any = new MockTools();

        async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
          return ok("");
        }
      }

      hooks(MyClass, {
        myMethod: [MigrateConditionHandlerMW],
      });
      const my = new MyClass();
      const inputs: Inputs = { platform: Platform.VSCode };
      inputs.projectPath = undefined;
      const res = await my.myMethod(inputs);
      assert.isTrue(res.isErr());
    });

    it("Failed to migrate V1 project before v1.2.0", async () => {
      class MyClass {
        tools?: any = new MockTools();

        async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
          return ok("");
        }
      }

      hooks(MyClass, {
        myMethod: [MigrateConditionHandlerMW],
      });
      const my = new MyClass();
      const inputs: Inputs = { platform: Platform.VSCode };
      inputs.projectPath = path.join(os.tmpdir(), randomAppName());
      try {
        await fs.ensureDir(inputs.projectPath);
        await fs.writeJSON(path.join(inputs.projectPath, "package.json"), { msteams: {} });
        const appPackagePath = path.join(inputs.projectPath, AppPackageFolderName);
        await fs.ensureDir(appPackagePath);
        const res = await my.myMethod(inputs);
        assert.isTrue(res.isErr());
      } finally {
        await fs.rmdir(inputs.projectPath!, { recursive: true });
      }
    });

    it("Failed to migrate V1 project if archive folder already exists", async () => {
      class MyClass {
        tools?: any = new MockTools();

        async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
          return ok("");
        }
      }

      hooks(MyClass, {
        myMethod: [MigrateConditionHandlerMW],
      });
      const my = new MyClass();
      const inputs: Inputs = { platform: Platform.VSCode };
      inputs.projectPath = path.join(os.tmpdir(), randomAppName());
      try {
        await fs.ensureDir(inputs.projectPath);
        await fs.writeJSON(path.join(inputs.projectPath, "package.json"), { msteams: {} });
        const appPackagePath = path.join(inputs.projectPath, AppPackageFolderName);
        await fs.ensureDir(appPackagePath);
        await fs.writeJSON(path.join(appPackagePath, "manifest.json"), {});

        await fs.ensureDir(path.join(inputs.projectPath, ArchiveFolderName));
        const res = await my.myMethod(inputs);
        assert.isTrue(res.isErr());
      } finally {
        await fs.rmdir(inputs.projectPath!, { recursive: true });
      }
    });

    it("Failed to migrate v1 bot sso project", async () => {
      class MyClass {
        tools?: any = new MockTools();

        async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
          return ok("");
        }
      }

      hooks(MyClass, {
        myMethod: [MigrateConditionHandlerMW],
      });
      const my = new MyClass();
      const inputs: Inputs = { platform: Platform.VSCode };
      inputs.projectPath = path.join(os.tmpdir(), randomAppName());
      try {
        await fs.ensureDir(inputs.projectPath);
        await fs.writeJSON(path.join(inputs.projectPath, "package.json"), { msteams: {} });
        const appPackagePath = path.join(inputs.projectPath, AppPackageFolderName);
        await fs.ensureDir(appPackagePath);
        await fs.writeJSON(path.join(appPackagePath, "manifest.json"), {});

        await fs.writeFile(path.join(inputs.projectPath, ".env"), "connectionName=xxx");

        const res = await my.myMethod(inputs);
        assert.isTrue(res.isErr());
      } finally {
        await fs.rmdir(inputs.projectPath!, { recursive: true });
      }
    });

    it("Migrate v1 project without env file", async () => {
      class MyClass {
        tools?: any = new MockTools();

        async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
          return ok("");
        }
      }

      hooks(MyClass, {
        myMethod: [MigrateConditionHandlerMW],
      });
      const my = new MyClass();
      const inputs: Inputs = { platform: Platform.VSCode };
      inputs.projectPath = path.join(os.tmpdir(), randomAppName());
      try {
        await fs.ensureDir(inputs.projectPath);
        await fs.writeJSON(path.join(inputs.projectPath, "package.json"), { msteams: {} });
        const appPackagePath = path.join(inputs.projectPath, AppPackageFolderName);
        await fs.ensureDir(appPackagePath);
        await fs.writeJSON(path.join(appPackagePath, "manifest.json"), {});
        const res = await my.myMethod(inputs);
        assert.isTrue(res.isOk());
      } finally {
        await fs.rmdir(inputs.projectPath!, { recursive: true });
      }
    });

    it("Migrate v1 project with valid .env file", async () => {
      class MyClass {
        tools?: any = new MockTools();

        async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
          return ok("");
        }
      }

      hooks(MyClass, {
        myMethod: [MigrateConditionHandlerMW],
      });
      const my = new MyClass();
      const inputs: Inputs = { platform: Platform.VSCode };
      inputs.projectPath = path.join(os.tmpdir(), randomAppName());
      try {
        await fs.ensureDir(inputs.projectPath);
        await fs.writeJSON(path.join(inputs.projectPath, "package.json"), { msteams: {} });
        const appPackagePath = path.join(inputs.projectPath, AppPackageFolderName);
        await fs.ensureDir(appPackagePath);
        await fs.writeJSON(path.join(appPackagePath, "manifest.json"), {});

        await fs.writeFile(path.join(inputs.projectPath, ".env"), "HTTPS=true\nBROWSER=none");

        const res = await my.myMethod(inputs);
        assert.isTrue(res.isOk());
      } finally {
        await fs.rmdir(inputs.projectPath!, { recursive: true });
      }
    });

    it("Migrate V1 project with invalid .env file", async () => {
      class MyClass {
        tools?: any = new MockTools();

        async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
          return ok("");
        }
      }

      hooks(MyClass, {
        myMethod: [MigrateConditionHandlerMW],
      });
      const my = new MyClass();
      const inputs: Inputs = { platform: Platform.VSCode };
      inputs.projectPath = path.join(os.tmpdir(), randomAppName());
      try {
        await fs.ensureDir(inputs.projectPath);
        await fs.writeJSON(path.join(inputs.projectPath, "package.json"), { msteams: {} });
        const appPackagePath = path.join(inputs.projectPath, AppPackageFolderName);
        await fs.ensureDir(appPackagePath);
        await fs.writeJSON(path.join(appPackagePath, "manifest.json"), {});

        await fs.writeFile(path.join(inputs.projectPath, ".env"), "{}");

        const res = await my.myMethod(inputs);
        assert.isTrue(res.isOk());
      } finally {
        await fs.rmdir(inputs.projectPath!, { recursive: true });
      }
    });
  });

  describe("migrateArm success", () => {
    const sandbox = sinon.createSandbox();
    const appName = randomAppName();
    const projectPath = "MigrationArmSuccessTestSample";
    beforeEach(async () => {
      await fs.ensureDir(projectPath);
      await fs.ensureDir(path.join(projectPath, ".fx"));
      sandbox.stub(environmentManager, "listEnvConfigs").resolves(ok(["dev"]));
      await fs.copy(
        path.join(__dirname, "../samples/migration/.fx/env.default.json"),
        path.join(projectPath, ".fx", "env.default.json")
      );
      await fs.copy(
        path.join(__dirname, "../samples/migration/.fx/settings.json"),
        path.join(projectPath, ".fx", "settings.json")
      );
      mockedEnvRestore = mockedEnv({
        __TEAMSFX_INSIDER_PREVIEW: "true",
      });
    });
    afterEach(async () => {
      await fs.remove(projectPath);
      sandbox.restore();
      mockedEnvRestore();
    });
    it("successfully migration arm templates", async () => {
      class MyClass {
        tools = new MockTools();
        async other(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
          return ok("");
        }
      }
      hooks(MyClass, {
        other: [migrateArm],
      });
      const my = new MyClass();
      const inputs: Inputs = {
        platform: Platform.VSCode,
        projectPath: projectPath,
        ignoreEnvInfo: true,
      };
      await my.other(inputs);
      assert.isTrue(await fs.pathExists(path.join(projectPath, ".fx", "configs")));
      assert.isTrue(
        await fs.pathExists(path.join(projectPath, ".fx", "configs", "azure.parameters.dev.json"))
      );
      assert.isTrue(await fs.pathExists(path.join(projectPath, "templates", "azure")));
      assert.isTrue(
        await fs.pathExists(path.join(projectPath, "templates", "azure", "main.bicep"))
      );
      assert.isTrue(await fs.pathExists(path.join(projectPath, "templates", "azure", "provision")));
      assert.isTrue(await fs.pathExists(path.join(projectPath, "templates", "azure", "teamsFx")));
      const armParam = await fs.readJson(
        path.join(projectPath, ".fx", "configs", "azure.parameters.dev.json")
      );
      assert.isNotNull(armParam.parameters.resourceBaseName);
      assert.isNotNull(armParam.parameters.azureSql_admin);
      const parameterObj = armParam.parameters.provisionParameters.value;
      assert.isNotNull(parameterObj);
      assert.strictEqual(parameterObj[ArmParameters.FEStorageName], "test");
      assert.strictEqual(parameterObj[ArmParameters.IdentityName], "test");
      assert.strictEqual(parameterObj[ArmParameters.SQLServer], "test");
      assert.strictEqual(parameterObj[ArmParameters.SQLDatabase], "test");
      assert.strictEqual(parameterObj[ArmParameters.functionServerName], "test");
      assert.strictEqual(parameterObj[ArmParameters.functionStorageName], "test");
      assert.strictEqual(parameterObj[ArmParameters.functionAppName], "test");
      assert.strictEqual(parameterObj[ArmParameters.ApimServiceName], "test");
      assert.strictEqual(parameterObj[ArmParameters.ApimProductName], "test");
      assert.strictEqual(parameterObj[ArmParameters.ApimOauthServerName], "test");
    });
  });

  describe("ProjectMigratorMW", () => {
    const sandbox = sinon.createSandbox();
    const appName = randomAppName();
    const projectPath = path.join(os.tmpdir(), appName);

    beforeEach(async () => {
      await fs.ensureDir(projectPath);
      mockedEnvRestore = mockedEnv({
        __TEAMSFX_INSIDER_PREVIEW: "true",
      });
      sandbox.stub(MockUserInteraction.prototype, "showMessage").resolves(ok("Upgrade"));
    });

    afterEach(async () => {
      await fs.remove(projectPath);
      sandbox.restore();
      mockedEnvRestore();
    });

    it("successfully migrate to version of arm and multi-env", async () => {
      await fs.copy(path.join(__dirname, "../samples/migration/"), path.join(projectPath));
      class MyClass {
        tools?: any = new MockTools();
        async other(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
          return ok("");
        }
      }
      hooks(MyClass, {
        other: [ProjectMigratorMW],
      });

      const inputs: Inputs = { platform: Platform.VSCode, ignoreEnvInfo: true };
      inputs.projectPath = projectPath;
      const my = new MyClass();
      try {
        const res = await my.other(inputs);
        assert.isTrue(res.isOk());
        const configDev = await fs.readJson(
          path.join(inputs.projectPath, ".fx", "configs", "config.dev.json")
        );
        assert.isTrue(configDev["skipAddingSqlUser"]);
        assert.isNotNull(configDev["auth"]);
        assert.strictEqual(configDev["auth"]["accessAsUserScopeId"], "test");
        assert.strictEqual(configDev["auth"]["objectId"], "test");
        assert.strictEqual(configDev["auth"]["clientId"], "test");
        assert.strictEqual(configDev["auth"]["clientSecret"], "{{ $env.AAD_APP_CLIENT_SECRET }}");
      } finally {
        await fs.rmdir(inputs.projectPath!, { recursive: true });
      }
    });

    it("pre check with error manifest file", async () => {
      await fs.copy(
        path.join(__dirname, "../samples/migrationErrorManifest/"),
        path.join(projectPath)
      );
      class MyClass {
        tools?: any = new MockTools();
        async other(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
          return ok("");
        }
      }
      hooks(MyClass, {
        other: [ProjectMigratorMW],
      });

      const inputs: Inputs = { platform: Platform.VSCode };
      inputs.projectPath = projectPath;
      const my = new MyClass();
      try {
        await my.other(inputs);
        assert.fail();
      } catch (e) {
      } finally {
        await fs.rmdir(inputs.projectPath!, { recursive: true });
      }
    });

    it("successfully update the tab project migrated from v1", async () => {
      await fs.copy(path.join(__dirname, "../samples/migrationV1Tab/"), path.join(projectPath));
      class MyClass {
        tools?: any = new MockTools();
        async other(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
          return ok("");
        }
      }
      hooks(MyClass, {
        other: [ProjectMigratorMW],
      });

      const inputs: Inputs = { platform: Platform.VSCode };
      inputs.projectPath = projectPath;
      const my = new MyClass();

      try {
        const res = await my.other(inputs);
        assert.isTrue(res.isOk());

        const azureParameterExists = await fs.pathExists(
          path.join(inputs.projectPath!, ".fx/configs/azure.parameters.dev.json")
        );
        assert.isFalse(azureParameterExists);
        const azureTemplateExists = await fs.pathExists(
          path.join(inputs.projectPath!, "templates/azure")
        );
        assert.isFalse(azureTemplateExists);
        const remoteManifestExists = await fs.pathExists(
          path.join(inputs.projectPath!, "templates/appPackage/manifest.remote.template.json")
        );
        assert.isFalse(remoteManifestExists);
        const devConfigExists = await fs.pathExists(
          path.join(inputs.projectPath!, ".fx/configs/config.dev.json")
        );
        assert.isFalse(devConfigExists);

        const localSettingsContent = await fs.readJson(
          path.join(inputs.projectPath!, ".fx/configs/localSettings.json")
        );
        assert.isNotEmpty(localSettingsContent?.frontend);
        assert.isNotEmpty(localSettingsContent?.teamsApp);
        const projectSettingsContent = await fs.readJson(
          path.join(inputs.projectPath!, ".fx/configs/projectSettings.json")
        );
        assert.isTrue(projectSettingsContent?.solutionSettings?.migrateFromV1);
        const localManifest = await fs.readJson(
          path.join(inputs.projectPath!, "templates/appPackage/manifest.local.template.json")
        );
        assert.equal(localManifest?.icons?.color, "color.png");
        assert.equal(localManifest?.icons?.outline, "outline.png");
        assert.equal(localManifest?.id, "{{localSettings.teamsApp.teamsAppId}}");
      } finally {
        await fs.rmdir(inputs.projectPath!, { recursive: true });
      }
    });
    it("successfully update the bot project migrated from v1", async () => {
      await fs.copy(path.join(__dirname, "../samples/migrationV1Bot/"), path.join(projectPath));
      class MyClass {
        tools?: any = new MockTools();
        async other(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
          return ok("");
        }
      }
      hooks(MyClass, {
        other: [ProjectMigratorMW],
      });

      const inputs: Inputs = { platform: Platform.VSCode };
      inputs.projectPath = projectPath;
      const my = new MyClass();

      try {
        const res = await my.other(inputs);
        assert.isTrue(res.isOk());

        const azureParameterExists = await fs.pathExists(
          path.join(inputs.projectPath!, ".fx/configs/azure.parameters.dev.json")
        );
        assert.isFalse(azureParameterExists);
        const azureTemplateExists = await fs.pathExists(
          path.join(inputs.projectPath!, "templates/azure")
        );
        assert.isFalse(azureTemplateExists);
        const remoteManifestExists = await fs.pathExists(
          path.join(inputs.projectPath!, "templates/appPackage/manifest.remote.template.json")
        );
        assert.isFalse(remoteManifestExists);
        const devConfigExists = await fs.pathExists(
          path.join(inputs.projectPath!, ".fx/configs/config.dev.json")
        );
        assert.isFalse(devConfigExists);

        const localSettingsContent = await fs.readJson(
          path.join(inputs.projectPath!, ".fx/configs/localSettings.json")
        );
        assert.isNotEmpty(localSettingsContent?.bot);
        assert.isNotEmpty(localSettingsContent?.teamsApp);
        const projectSettingsContent = await fs.readJson(
          path.join(inputs.projectPath!, ".fx/configs/projectSettings.json")
        );
        assert.isTrue(projectSettingsContent?.solutionSettings?.migrateFromV1);
        const localManifest = await fs.readJson(
          path.join(inputs.projectPath!, "templates/appPackage/manifest.local.template.json")
        );
        assert.equal(localManifest?.icons?.color, "color.png");
        assert.equal(localManifest?.icons?.outline, "outline.png");
        assert.equal(localManifest?.id, "{{localSettings.teamsApp.teamsAppId}}");
      } finally {
        await fs.rmdir(inputs.projectPath!, { recursive: true });
      }
    });
  });
  describe("EnvInfoLoaderMW with MultiEnv enabled", () => {
    const expectedResult = "ok";
    const projectPath = "mock/this/does/not/exists";

    function MockProjectSettingsLoaderMW() {
      return async (ctx: CoreHookContext, next: NextFunction) => {
        ctx.projectSettings = {
          appName: "testApp",
          version: "1.0",
          projectId: "abcd",
          solutionSettings: {
            name: "fx-solution-azure",
          },
        };
        await next();
      };
    }
    async function SolutionContextSpyMW(ctx: CoreHookContext, next: NextFunction) {
      await next();
      solutionContext = ctx.solutionContext;
    }

    // test variables
    let solutionContext: SolutionContext | undefined;
    let envLoaded: string | undefined = undefined;
    let mockedEnvRestore: RestoreFn;
    beforeEach(() => {
      mockedEnvRestore = mockedEnv({ TEAMSFX_APIV2: "false" });
      solutionContext = undefined;
      envLoaded = undefined;

      // stub functions before
      sandbox.stub(commonTools, "isMultiEnvEnabled").returns(true);

      // stub environmentManager.loadEnvInfo()
      sandbox
        .stub(environmentManager, "loadEnvInfo")
        .callsFake(
          async (
            projectPath: string,
            cryptoProvider: CryptoProvider,
            maybeEnvName?: string
          ): Promise<Result<EnvInfo, FxError>> => {
            const envName = maybeEnvName ?? environmentManager.getDefaultEnvName();
            envLoaded = envName;

            const envConfig: EnvConfig = {
              manifest: {
                appName: {
                  short: "testApp",
                },
              },
            };
            const envState = new Map<string, any>();
            const envInfo = {
              envName: envName,
              config: envConfig,
              state: envState,
            };
            return ok(envInfo);
          }
        );

      // mock fs.existsSync for EnvInfoLoader
      const originalPathExists = fs.pathExists;
      sandbox.stub(fs, "pathExists").callsFake(async (path: string) => {
        if (path === projectPath) {
          return true;
        } else {
          return originalPathExists(path);
        }
      });
    });
    afterEach(() => {
      mockedEnvRestore();
    });
    describe("skipping logic", async () => {
      it("skips on getQuestions of the create stage", async () => {
        // Arrange
        const inputs: Inputs = {
          platform: Platform.VSCode,
          projectPath: projectPath,
        };
        class MyClass {
          tools: Tools = new MockTools();
          async getQuestions(stage: Stage, inputs: Inputs): Promise<Result<string, FxError>> {
            return ok(expectedResult);
          }
        }

        // Act
        hooks(MyClass, {
          getQuestions: [
            MockProjectSettingsLoaderMW(),
            EnvInfoLoaderMW(true),
            SolutionContextSpyMW,
          ],
        });
        const my = new MyClass();
        const res = await my.getQuestions(Stage.create, inputs);

        // Assert
        assert.isUndefined(envLoaded);
        assert.isTrue(res.isOk());
        assert.isUndefined(solutionContext);
      });

      it("skips statically", async () => {
        // Arrange
        const inputs: Inputs = {
          platform: Platform.VSCode,
          projectPath: projectPath,
        };
        class MyClass {
          tools: Tools = new MockTools();
          async myMethod(inputs: Inputs): Promise<Result<string, FxError>> {
            return ok(expectedResult);
          }
        }

        // Act
        hooks(MyClass, {
          myMethod: [MockProjectSettingsLoaderMW(), EnvInfoLoaderMW(true), SolutionContextSpyMW],
        });
        const my = new MyClass();
        const res = await my.myMethod(inputs);

        // Assert
        assert.isUndefined(envLoaded);
        assert.isTrue(res.isOk());
        assert(solutionContext);
        // envInfo should be set to a default value when envInfo loading is skipped.
        assert.equal(solutionContext?.envInfo.envName, environmentManager.getDefaultEnvName());
      });

      it("skips dynamically with inputs.ignoreEnvInfo", async () => {
        // Arrange
        const inputs: Inputs = {
          platform: Platform.VSCode,
          projectPath: projectPath,
          ignoreEnvInfo: true,
        };
        class MyClass {
          tools: Tools = new MockTools();
          async myMethod(inputs: Inputs): Promise<Result<string, FxError>> {
            return ok(expectedResult);
          }
        }

        // Act
        hooks(MyClass, {
          myMethod: [MockProjectSettingsLoaderMW(), EnvInfoLoaderMW(false), SolutionContextSpyMW],
        });
        const my = new MyClass();
        const res = await my.myMethod(inputs);

        // Assert
        assert.isUndefined(envLoaded);
        assert.isTrue(res.isOk());
        assert(solutionContext);
        // envInfo should be set to a default value when envInfo loading is skipped.
        assert.equal(solutionContext?.envInfo.envName, environmentManager.getDefaultEnvName());
      });
    });

    describe("using inputs.env", async () => {
      it("accepts inputs.env", async () => {
        // Arrange
        const env = "staging";
        const inputs: Inputs = {
          platform: Platform.VSCode,
          projectPath: projectPath,
          env: env,
        };
        class MyClass {
          tools: Tools = new MockTools();
          async myMethod(inputs: Inputs): Promise<Result<string, FxError>> {
            return ok(expectedResult);
          }
        }
        sandbox
          .stub(environmentManager, "checkEnvExist")
          .callsFake(async (projectPath: string, envName: string) => {
            if (envName === env) {
              return ok(true);
            } else {
              throw new Error("unreachable");
            }
          });

        // Act
        hooks(MyClass, {
          myMethod: [MockProjectSettingsLoaderMW(), EnvInfoLoaderMW(false), SolutionContextSpyMW],
        });
        const my = new MyClass();
        const res = await my.myMethod(inputs);

        // Assert
        assert.equal(envLoaded, env);
        assert.isTrue(res.isOk());
        assert.equal((res as Ok<string, FxError>).value, expectedResult);
        assert(solutionContext);
        assert.equal(solutionContext?.envInfo.envName, env);
      });

      it("handles error for non-existent inputs.env", async () => {
        // Arrange
        const nonExistentEnvName = "nonExistentEnvName";
        const inputs: Inputs = {
          platform: Platform.VSCode,
          projectPath: projectPath,
          env: nonExistentEnvName,
        };
        class MyClass {
          tools: Tools = new MockTools();
          async myMethod(inputs: Inputs): Promise<Result<string, FxError>> {
            return ok(expectedResult);
          }
        }
        sandbox
          .stub(environmentManager, "checkEnvExist")
          .callsFake(async (projectPath: string, env: string) => {
            if (env === nonExistentEnvName) {
              return ok(false);
            } else {
              throw new Error("unreachable");
            }
          });

        // Act
        hooks(MyClass, {
          myMethod: [MockProjectSettingsLoaderMW(), EnvInfoLoaderMW(false), SolutionContextSpyMW],
        });
        const my = new MyClass();
        const res = await my.myMethod(inputs);

        // Assert
        assert.isTrue(res.isErr());
        assert.equal((res as Err<string, FxError>).error.name, "ProjectEnvNotExistError");
        assert(!solutionContext);
      });
    });

    describe("asking env interactively", async () => {
      it("asks env interactively and put the last used env first", async () => {
        // Arrange
        const inputs: Inputs = {
          platform: Platform.VSCode,
          projectPath: projectPath,
        };
        let envs = ["staging", "e2e", "test"];
        class MockUserInteractionSelectFirst extends MockUserInteraction {
          public async selectOption(
            config: SingleSelectConfig
          ): Promise<Result<SingleSelectResult, FxError>> {
            if (config.options.length === 0) {
              throw new Error("There is no options to select");
            }
            return ok({ type: "success", result: config.options[0] });
          }
        }
        const tools = new MockTools();
        tools.ui = new MockUserInteractionSelectFirst();
        class MyClass {
          tools: Tools = tools;
          async myMethod(inputs: Inputs): Promise<Result<string, FxError>> {
            return ok(expectedResult);
          }
        }
        sandbox
          .stub(environmentManager, "listEnvConfigs")
          .callsFake(async (projectPath: string) => {
            return ok(envs);
          });
        sandbox
          .stub(environmentManager, "checkEnvExist")
          .callsFake(async (projectPath: string, env: string) => {
            return ok(envs.includes(env));
          });

        // Act
        hooks(MyClass, {
          myMethod: [MockProjectSettingsLoaderMW(), EnvInfoLoaderMW(false), SolutionContextSpyMW],
        });
        const my = new MyClass();
        const res = await my.myMethod(inputs);

        // Assert
        // mock question model always returns the first option
        assert.equal(envLoaded, envs[0]);
        assert.isTrue(res.isOk());
        assert.equal((res as Ok<string, FxError>).value, expectedResult);
        assert(solutionContext);
        assert.equal(solutionContext?.envInfo.envName, envs[0]);

        // Arrange
        // reorder envs to check whether the lastUsedEnv appears first
        envs = [envs[2], ...envs.slice(0, 2)];

        // Act
        hooks(MyClass, {
          myMethod: [MockProjectSettingsLoaderMW(), EnvInfoLoaderMW(false), SolutionContextSpyMW],
        });

        // Assert
        const res2 = await my.myMethod(inputs);
        assert.equal(envLoaded, envs[1]);
        assert.isTrue(res2.isOk());
        assert.equal((res2 as Ok<string, FxError>).value, expectedResult);
        assert(solutionContext);
        assert.equal(solutionContext?.envInfo.envName, envs[1]);
      });

      it("handles user canceling", async () => {
        // Arrange
        const inputs: Inputs = {
          platform: Platform.VSCode,
          projectPath: projectPath,
        };
        const envs = ["staging", "e2e", "test"];
        class MockUserInteractionSelectFirst extends MockUserInteraction {
          public async selectOption(
            config: SingleSelectConfig
          ): Promise<Result<SingleSelectResult, FxError>> {
            return err(UserCancelError);
          }
        }
        const tools = new MockTools();
        tools.ui = new MockUserInteractionSelectFirst();
        class MyClass {
          tools: Tools = tools;
          async myMethod(inputs: Inputs): Promise<Result<string, FxError>> {
            return ok(expectedResult);
          }
        }
        sandbox
          .stub(environmentManager, "listEnvConfigs")
          .callsFake(async (projectPath: string) => {
            return ok(envs);
          });

        // Act
        hooks(MyClass, {
          myMethod: [MockProjectSettingsLoaderMW(), EnvInfoLoaderMW(false)],
        });
        const my = new MyClass();
        const res = await my.myMethod(inputs);

        // Assert
        // mock question model always returns the first option
        assert.isTrue(res.isErr());
        assert.equal((res as Err<string, FxError>).error.name, "UserCancel");
      });
    });

    describe("order of precedence", async () => {
      let tools: Tools;
      const inputsEnv = "inputs";
      const askUserEnv = "askUser";
      const envs = [inputsEnv, askUserEnv];
      class MyClass {
        tools: Tools = tools;
        async myMethod(inputs: Inputs): Promise<Result<string, FxError>> {
          return ok(expectedResult);
        }
      }
      beforeEach(async () => {
        class MockUserInteractionSelectFirst extends MockUserInteraction {
          public async selectOption(
            config: SingleSelectConfig
          ): Promise<Result<SingleSelectResult, FxError>> {
            return ok({ type: "success", result: askUserEnv });
          }
        }
        tools = new MockTools();
        tools.ui = new MockUserInteractionSelectFirst();

        sandbox
          .stub(environmentManager, "listEnvConfigs")
          .callsFake(async (projectPath: string) => {
            return ok(envs);
          });
        sandbox.stub(environmentManager, "checkEnvExist").returns(Promise.resolve(ok(true)));
      });

      it("prefers inputs.env than asking user", async () => {
        // Arrange
        const inputs: Inputs = {
          platform: Platform.VSCode,
          projectPath: projectPath,
          env: inputsEnv,
        };

        // Act
        hooks(MyClass, {
          myMethod: [MockProjectSettingsLoaderMW(), EnvInfoLoaderMW(false), SolutionContextSpyMW],
        });
        const my = new MyClass();
        const res = await my.myMethod(inputs);

        // Assert
        assert.isTrue(res.isOk());
        assert.equal((res as Ok<string, FxError>).value, expectedResult);
        assert(solutionContext);
        assert.equal(envLoaded, inputsEnv);
        assert.equal(solutionContext?.envInfo.envName, inputsEnv);
      });
    });

    describe("error handling", async () => {
      // Test cases for error handling
      it("handles error when project settings is undefined", async () => {
        // Arrange
        const inputs: Inputs = {
          platform: Platform.VSCode,
          projectPath: projectPath,
        };
        class MyClass {
          tools: Tools = new MockTools();
          async myMethod(inputs: Inputs): Promise<Result<string, FxError>> {
            return ok(expectedResult);
          }
        }

        // Act
        hooks(MyClass, {
          myMethod: [EnvInfoLoaderMW(false)],
        });
        const my = new MyClass();
        const res = await my.myMethod(inputs);

        // Assert
        assert.isTrue(res.isErr());
        assert.equal((res as Err<string, FxError>).error.name, "ProjectSettingsUndefinedError");
      });
    });
  });
});
