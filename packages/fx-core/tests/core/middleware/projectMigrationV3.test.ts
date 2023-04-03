// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author xzf0587 <zhaofengxu@microsoft.com>
 */
import { hooks } from "@feathersjs/hooks/lib";
import { err, FxError, Inputs, ok, Platform, Result } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import mockedEnv from "mocked-env";
import * as os from "os";
import * as path from "path";
import * as sinon from "sinon";
import { MockTools, MockUserInteraction, randomAppName } from "../utils";
import { CoreHookContext } from "../../../src/core/types";
import { setTools } from "../../../src/core/globalVars";
import {
  backupFolder,
  MigrationContext,
} from "../../../src/core/middleware/utils/migrationContext";
import {
  generateAppYml,
  manifestsMigration,
  statesMigration,
  updateLaunchJson,
  migrate,
  wrapRunMigration,
  checkVersionForMigration,
  configsMigration,
  generateApimPluginEnvContent,
  userdataMigration,
  debugMigration,
  azureParameterMigration,
  generateLocalConfig,
  checkapimPluginExists,
  ProjectMigratorMWV3,
  errorNames,
} from "../../../src/core/middleware/projectMigratorV3";
import * as MigratorV3 from "../../../src/core/middleware/projectMigratorV3";
import { NotAllowedMigrationError, UpgradeCanceledError } from "../../../src/core/error";
import {
  Metadata,
  MetadataV2,
  MetadataV3,
  VersionSource,
  VersionState,
} from "../../../src/common/versionMetadata";
import {
  buildEnvUserFileName,
  getDownloadLinkByVersionAndPlatform,
  getTrackingIdFromPath,
  getVersionState,
  migrationNotificationMessage,
  outputCancelMessage,
} from "../../../src/core/middleware/utils/v3MigrationUtils";
import { getProjectSettingPathV3 } from "../../../src/core/middleware/projectSettingsLoader";
import * as debugV3MigrationUtils from "../../../src/core/middleware/utils/debug/debugV3MigrationUtils";
import { VersionForMigration } from "../../../src/core/middleware/types";
import * as loader from "../../../src/core/middleware/projectSettingsLoader";
import { SettingsUtils } from "../../../src/component/utils/settingsUtil";

let mockedEnvRestore: () => void;
const mockedId = "00000000-0000-0000-0000-000000000000";

describe("ProjectMigratorMW", () => {
  const sandbox = sinon.createSandbox();
  const appName = randomAppName();
  const projectPath = path.join(os.tmpdir(), appName);

  beforeEach(async () => {
    await fs.ensureDir(projectPath);
    await fs.ensureDir(path.join(projectPath, ".fx"));
    mockedEnvRestore = mockedEnv({
      TEAMSFX_V3: "true",
    });
  });

  afterEach(async () => {
    await fs.remove(projectPath);
    sandbox.restore();
    mockedEnvRestore();
  });

  it("happy path", async () => {
    sandbox
      .stub(MockUserInteraction.prototype, "showMessage")
      .onCall(0)
      .resolves(ok("More Info"))
      .onCall(1)
      .resolves(ok("Upgrade"));
    sandbox.stub(MockUserInteraction.prototype, "openUrl").resolves(ok(true));
    const tools = new MockTools();
    setTools(tools);
    await copyTestProject(Constants.happyPathTestProject, projectPath);
    class MyClass {
      tools = tools;
      async other(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
        return ok("");
      }
    }
    hooks(MyClass, {
      other: [ProjectMigratorMWV3],
    });

    const inputs: Inputs = { platform: Platform.VSCode, ignoreEnvInfo: true };
    inputs.projectPath = projectPath;
    const my = new MyClass();
    try {
      const res = await my.other(inputs);
      assert.isTrue(res.isOk());
    } finally {
      await fs.rmdir(inputs.projectPath!, { recursive: true });
    }
  });

  it("user cancel", async () => {
    sandbox
      .stub(MockUserInteraction.prototype, "showMessage")
      .resolves(err(new Error("user cancel") as FxError));
    const tools = new MockTools();
    setTools(tools);
    await copyTestProject(Constants.happyPathTestProject, projectPath);
    class MyClass {
      tools = tools;
      async other(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
        return ok("");
      }
    }
    hooks(MyClass, {
      other: [ProjectMigratorMWV3],
    });

    const inputs: Inputs = { platform: Platform.VSCode, ignoreEnvInfo: true };
    inputs.projectPath = projectPath;
    const my = new MyClass();
    try {
      const res = await my.other(inputs);
      assert.isTrue(res.isErr());
    } finally {
      await fs.rmdir(inputs.projectPath!, { recursive: true });
    }
  });

  it("wrap run error ", async () => {
    const tools = new MockTools();
    setTools(tools);
    sandbox.stub(MigratorV3, "migrate").throws(new Error("mocker error"));
    await copyTestProject(Constants.happyPathTestProject, projectPath);
    const inputs: Inputs = { platform: Platform.VSCode, ignoreEnvInfo: true };
    inputs.projectPath = projectPath;
    const ctx = {
      arguments: [inputs],
    };
    const context = await MigrationContext.create(ctx);
    const res = wrapRunMigration(context, migrate);
  });

  it("happy path run error - notAllowedMigrationError", async () => {
    const tools = new MockTools();
    setTools(tools);
    await copyTestProject(Constants.happyPathTestProject, projectPath);
    class MyClass {
      tools = tools;
      async other(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
        return ok("");
      }
    }
    hooks(MyClass, {
      other: [ProjectMigratorMWV3],
    });
    const inputs: Inputs = { platform: Platform.VSCode, ignoreEnvInfo: true, nonInteractive: true };
    inputs.projectPath = projectPath;
    const my = new MyClass();
    try {
      const res = await my.other(inputs);
      assert.isTrue(res.isErr());
      assert.instanceOf((res as any).error, NotAllowedMigrationError);
    } finally {
      await fs.rmdir(inputs.projectPath!, { recursive: true });
    }
  });
});

describe("ProjectMigratorMW with no TEAMSFX_V3", () => {
  const sandbox = sinon.createSandbox();
  const appName = randomAppName();
  const projectPath = path.join(os.tmpdir(), appName);

  beforeEach(async () => {
    await fs.ensureDir(projectPath);
    await fs.ensureDir(path.join(projectPath, ".fx"));
    mockedEnvRestore = mockedEnv({
      TEAMSFX_V3: "false",
    });
  });

  afterEach(async () => {
    await fs.remove(projectPath);
    sandbox.restore();
    mockedEnvRestore();
  });

  it("TEAMSFX_V3 is false", async () => {
    sandbox.stub(MockUserInteraction.prototype, "showMessage").resolves(ok(""));
    const tools = new MockTools();
    setTools(tools);
    await copyTestProject(Constants.happyPathTestProject, projectPath);
    class MyClass {
      tools = tools;
      async other(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
        return ok("");
      }
    }
    hooks(MyClass, {
      other: [ProjectMigratorMWV3],
    });

    const inputs: Inputs = { platform: Platform.VSCode, ignoreEnvInfo: true };
    inputs.projectPath = projectPath;
    const my = new MyClass();
    try {
      const res = await my.other(inputs);
      assert.isTrue(res.isErr());
    } finally {
      await fs.rmdir(inputs.projectPath!, { recursive: true });
    }
  });
});

describe("MigrationContext", () => {
  const sandbox = sinon.createSandbox();
  const appName = randomAppName();
  const projectPath = path.join(os.tmpdir(), appName);

  beforeEach(async () => {
    await fs.ensureDir(projectPath);
    await fs.ensureDir(path.join(projectPath, ".fx"));
  });

  afterEach(async () => {
    await fs.remove(projectPath);
    sandbox.restore();
    mockedEnvRestore();
  });

  it("happy path", async () => {
    const tools = new MockTools();
    setTools(tools);

    const inputs: Inputs = { platform: Platform.VSCode, ignoreEnvInfo: true };
    inputs.projectPath = projectPath;
    const ctx = {
      arguments: [inputs],
    };
    const context = await MigrationContext.create(ctx);
    let res = await context.backup(".fx");
    assert.isTrue(res);
    res = await context.backup("no-exist");
    assert.isFalse(res);
    await context.fsWriteFile("a", "test-data");
    await context.fsCopy("a", "a-copy");
    assert.isTrue(await fs.pathExists(path.join(context.projectPath, "a-copy")));
    await context.fsEnsureDir("b/c");
    assert.isTrue(await fs.pathExists(path.join(context.projectPath, "b/c")));
    await context.fsCreateFile("d");
    assert.isTrue(await fs.pathExists(path.join(context.projectPath, "d")));
    const modifiedPaths = context.getModifiedPaths();
    assert.isTrue(modifiedPaths.includes("a"));
    assert.isTrue(modifiedPaths.includes("a-copy"));
    assert.isTrue(modifiedPaths.includes("b"));
    assert.isTrue(modifiedPaths.includes("b/c"));
    assert.isTrue(modifiedPaths.includes("d"));
    await context.fsRemove("d");
    await context.cleanModifiedPaths();
    assert.isEmpty(context.getModifiedPaths());

    context.addReport("test report");
    context.addTelemetryProperties({ testProperrty: "test property" });
    await context.restoreBackup();
    await context.cleanBackup();
  });
});

describe("generateAppYml-js/ts", () => {
  const appName = randomAppName();
  const projectPath = path.join(os.tmpdir(), appName);
  let migrationContext: MigrationContext;

  beforeEach(async () => {
    migrationContext = await mockMigrationContext(projectPath);
    await fs.ensureDir(projectPath);
  });

  afterEach(async () => {
    await fs.remove(projectPath);
  });

  it("should success for js SSO tab", async () => {
    await copyTestProject("jsSsoTab", projectPath);

    await generateAppYml(migrationContext);

    await assertFileContent(projectPath, Constants.appYmlPath, "js.app.yml");
  });

  it("should success for ts SSO tab", async () => {
    await copyTestProject("jsSsoTab", projectPath);
    const projectSetting = await readOldProjectSettings(projectPath);
    projectSetting.programmingLanguage = "typescript";
    await fs.writeJson(
      path.join(projectPath, Constants.oldProjectSettingsFilePath),
      projectSetting
    );

    await generateAppYml(migrationContext);

    await assertFileContent(projectPath, Constants.appYmlPath, "ts.app.yml");
  });

  it("should success for js non SSO tab", async () => {
    await copyTestProject("jsNonSsoTab", projectPath);

    await generateAppYml(migrationContext);

    await assertFileContent(projectPath, Constants.appYmlPath, "js.app.yml");
  });

  it("should success for ts non SSO tab", async () => {
    await copyTestProject("jsNonSsoTab", projectPath);
    const projectSetting = await readOldProjectSettings(projectPath);
    projectSetting.programmingLanguage = "typescript";
    await fs.writeJson(
      path.join(projectPath, Constants.oldProjectSettingsFilePath),
      projectSetting
    );

    await generateAppYml(migrationContext);

    await assertFileContent(projectPath, Constants.appYmlPath, "ts.app.yml");
  });

  it("should success for js tab with api", async () => {
    await copyTestProject("jsTabWithApi", projectPath);

    await generateAppYml(migrationContext);

    await assertFileContent(projectPath, Constants.appYmlPath, "js.app.yml");
  });

  it("should success for ts tab with api", async () => {
    await copyTestProject("jsTabWithApi", projectPath);
    const projectSetting = await readOldProjectSettings(projectPath);
    projectSetting.programmingLanguage = "typescript";
    await fs.writeJson(
      path.join(projectPath, Constants.oldProjectSettingsFilePath),
      projectSetting
    );

    await generateAppYml(migrationContext);

    await assertFileContent(projectPath, Constants.appYmlPath, "ts.app.yml");
  });

  it("should success for js function bot", async () => {
    await copyTestProject("jsFunctionBot", projectPath);

    await generateAppYml(migrationContext);

    await assertFileContent(projectPath, Constants.appYmlPath, "js.app.yml");
  });

  it("should success for ts function bot", async () => {
    await copyTestProject("jsFunctionBot", projectPath);
    const projectSetting = await readOldProjectSettings(projectPath);
    projectSetting.programmingLanguage = "typescript";
    await fs.writeJson(
      path.join(projectPath, Constants.oldProjectSettingsFilePath),
      projectSetting
    );

    await generateAppYml(migrationContext);

    await assertFileContent(projectPath, Constants.appYmlPath, "ts.app.yml");
  });

  it("should success for js webapp bot", async () => {
    await copyTestProject("jsWebappBot", projectPath);

    await generateAppYml(migrationContext);

    await assertFileContent(projectPath, Constants.appYmlPath, "js.app.yml");
  });

  it("should success for ts webapp bot", async () => {
    await copyTestProject("jsWebappBot", projectPath);
    const projectSetting = await readOldProjectSettings(projectPath);
    projectSetting.programmingLanguage = "typescript";
    await fs.writeJson(
      path.join(projectPath, Constants.oldProjectSettingsFilePath),
      projectSetting
    );

    await generateAppYml(migrationContext);

    await assertFileContent(projectPath, Constants.appYmlPath, "ts.app.yml");
  });

  it("should success for js webapp bot as resourceId eq botWebAppResourceId", async () => {
    await copyTestProject("jsWebappBot_botWebAppId", projectPath);

    await generateAppYml(migrationContext);

    await assertFileContent(projectPath, Constants.appYmlPath, "js.app.yml");
  });

  it("should success for ts webapp bot as resourceId eq botWebAppResourceId", async () => {
    await copyTestProject("jsWebappBot_botWebAppId", projectPath);
    const projectSetting = await readOldProjectSettings(projectPath);
    projectSetting.programmingLanguage = "typescript";
    await fs.writeJson(
      path.join(projectPath, Constants.oldProjectSettingsFilePath),
      projectSetting
    );

    await generateAppYml(migrationContext);

    await assertFileContent(projectPath, Constants.appYmlPath, "ts.app.yml");
  });

  it("should success for js function bot as resourceId eq botWebAppResourceId", async () => {
    await copyTestProject("jsFuncBot_botWebAppId", projectPath);

    await generateAppYml(migrationContext);

    await assertFileContent(projectPath, Constants.appYmlPath, "js.app.yml");
  });

  it("should success for ts function bot as resourceId eq botWebAppResourceId", async () => {
    await copyTestProject("jsFuncBot_botWebAppId", projectPath);
    const projectSetting = await readOldProjectSettings(projectPath);
    projectSetting.programmingLanguage = "typescript";
    await fs.writeJson(
      path.join(projectPath, Constants.oldProjectSettingsFilePath),
      projectSetting
    );

    await generateAppYml(migrationContext);

    await assertFileContent(projectPath, Constants.appYmlPath, "ts.app.yml");
  });

  it("should success for js webApp bot as resourceId eq webAppResourceId", async () => {
    await copyTestProject("jsWebappBot_webAppId", projectPath);

    await generateAppYml(migrationContext);

    await assertFileContent(projectPath, Constants.appYmlPath, "js.app.yml");
  });

  it("should success for ts webApp bot as resourceId eq webAppResourceId", async () => {
    await copyTestProject("jsWebappBot_webAppId", projectPath);
    const projectSetting = await readOldProjectSettings(projectPath);
    projectSetting.programmingLanguage = "typescript";
    await fs.writeJson(
      path.join(projectPath, Constants.oldProjectSettingsFilePath),
      projectSetting
    );

    await generateAppYml(migrationContext);

    await assertFileContent(projectPath, Constants.appYmlPath, "ts.app.yml");
  });

  it("should success for js function bot as resourceId eq webAppResourceId", async () => {
    await copyTestProject("jsFuncBot_webAppId", projectPath);

    await generateAppYml(migrationContext);

    await assertFileContent(projectPath, Constants.appYmlPath, "js.app.yml");
  });

  it("should success for ts function bot as resourceId eq webAppResourceId", async () => {
    await copyTestProject("jsFuncBot_webAppId", projectPath);
    const projectSetting = await readOldProjectSettings(projectPath);
    projectSetting.programmingLanguage = "typescript";
    await fs.writeJson(
      path.join(projectPath, Constants.oldProjectSettingsFilePath),
      projectSetting
    );

    await generateAppYml(migrationContext);

    await assertFileContent(projectPath, Constants.appYmlPath, "ts.app.yml");
  });
});

describe("generateAppYml-csharp", () => {
  const appName = randomAppName();
  const projectPath = path.join(os.tmpdir(), appName);
  let migrationContext: MigrationContext;

  beforeEach(async () => {
    migrationContext = await mockMigrationContext(projectPath);
    migrationContext.arguments.push({
      platform: "vs",
    });
    await fs.ensureDir(projectPath);
  });

  afterEach(async () => {
    await fs.remove(projectPath);
  });

  it("should success for sso tab project", async () => {
    await copyTestProject("csharpSsoTab", projectPath);

    await generateAppYml(migrationContext);

    await assertFileContent(projectPath, Constants.appYmlPath, "app.yml");
  });

  it("should success for non-sso tab project", async () => {
    await copyTestProject("csharpNonSsoTab", projectPath);

    await generateAppYml(migrationContext);

    await assertFileContent(projectPath, Constants.appYmlPath, "app.yml");
  });

  it("should success for web app bot project", async () => {
    await copyTestProject("csharpWebappBot", projectPath);

    await generateAppYml(migrationContext);

    await assertFileContent(projectPath, Constants.appYmlPath, "app.yml");
  });

  it("should success for function bot project", async () => {
    await copyTestProject("csharpFunctionBot", projectPath);

    await generateAppYml(migrationContext);

    await assertFileContent(projectPath, Constants.appYmlPath, "app.yml");
  });
});

describe("generateAppYml-csharp", () => {
  const appName = randomAppName();
  const projectPath = path.join(os.tmpdir(), appName);
  let migrationContext: MigrationContext;

  beforeEach(async () => {
    migrationContext = await mockMigrationContext(projectPath);
    migrationContext.arguments.push({
      platform: "vs",
    });
    await fs.ensureDir(projectPath);
  });

  afterEach(async () => {
    await fs.remove(projectPath);
  });

  it("should success for local sso tab project", async () => {
    await copyTestProject("csharpSsoTab", projectPath);

    await generateLocalConfig(migrationContext);
  });
});

describe("generateAppYml-spfx", () => {
  const appName = randomAppName();
  const projectPath = path.join(os.tmpdir(), appName);
  let migrationContext: MigrationContext;

  beforeEach(async () => {
    migrationContext = await mockMigrationContext(projectPath);
    await fs.ensureDir(projectPath);
  });

  afterEach(async () => {
    await fs.remove(projectPath);
  });

  it("should success for spfx project", async () => {
    await copyTestProject("spfxTab", projectPath);

    await generateAppYml(migrationContext);

    await assertFileContent(projectPath, Constants.appYmlPath, "app.yml");
  });
});

describe("manifestsMigration", () => {
  const sandbox = sinon.createSandbox();
  const appName = randomAppName();
  const projectPath = path.join(os.tmpdir(), appName);

  beforeEach(async () => {
    await fs.ensureDir(projectPath);
  });

  afterEach(async () => {
    await fs.remove(projectPath);
    sandbox.restore();
  });

  it("happy path: aad manifest exists", async () => {
    const migrationContext = await mockMigrationContext(projectPath);

    // Stub
    sandbox.stub(migrationContext, "backup").resolves(true);
    await copyTestProject(Constants.manifestsMigrationHappyPath, projectPath);

    // Action
    await manifestsMigration(migrationContext);

    // Assert
    const oldAppPackageFolderPath = path.join(projectPath, "templates", "appPackage");
    assert.isFalse(await fs.pathExists(oldAppPackageFolderPath));

    const appPackageFolderPath = path.join(projectPath, "appPackage");
    assert.isTrue(await fs.pathExists(appPackageFolderPath));

    const resourcesPath = path.join(appPackageFolderPath, "resources", "test.png");
    assert.isTrue(await fs.pathExists(resourcesPath));

    const manifestPath = path.join(appPackageFolderPath, "manifest.json");
    assert.isTrue(await fs.pathExists(manifestPath));
    const manifest = (await fs.readFile(manifestPath, "utf-8"))
      .replace(/\s/g, "")
      .replace(/\t/g, "")
      .replace(/\n/g, "");
    const manifestExpeceted = (
      await fs.readFile(path.join(projectPath, "expected", "manifest.json"), "utf-8")
    )
      .replace(/\s/g, "")
      .replace(/\t/g, "")
      .replace(/\n/g, "");
    assert.equal(manifest, manifestExpeceted);

    const aadManifestPath = path.join(projectPath, "aad.manifest.json");
    assert.isTrue(await fs.pathExists(aadManifestPath));
    const aadManifest = (await fs.readFile(aadManifestPath, "utf-8"))
      .replace(/\s/g, "")
      .replace(/\t/g, "")
      .replace(/\n/g, "");
    const aadManifestExpected = (
      await fs.readFile(path.join(projectPath, "expected", "aad.manifest.json"), "utf-8")
    )
      .replace(/\s/g, "")
      .replace(/\t/g, "")
      .replace(/\n/g, "");
    assert.equal(aadManifest, aadManifestExpected);
  });

  it("happy path: spfx", async () => {
    const migrationContext = await mockMigrationContext(projectPath);

    // Stub
    sandbox.stub(migrationContext, "backup").resolves(true);
    await copyTestProject(Constants.manifestsMigrationHappyPathSpfx, projectPath);

    // Action
    await manifestsMigration(migrationContext);

    // Assert
    const oldAppPackageFolderPath = path.join(projectPath, "templates", "appPackage");
    assert.isFalse(await fs.pathExists(oldAppPackageFolderPath));

    const appPackageFolderPath = path.join(projectPath, "appPackage");
    assert.isTrue(await fs.pathExists(appPackageFolderPath));

    const resourcesPath = path.join(appPackageFolderPath, "resources", "test.png");
    assert.isTrue(await fs.pathExists(resourcesPath));

    const remoteManifestPath = path.join(appPackageFolderPath, "manifest.json");
    assert.isTrue(await fs.pathExists(remoteManifestPath));
    const remoteManifest = (await fs.readFile(remoteManifestPath, "utf-8"))
      .replace(/\s/g, "")
      .replace(/\t/g, "")
      .replace(/\n/g, "");
    const remoteManifestExpeceted = (
      await fs.readFile(path.join(projectPath, "expected", "manifest.json"), "utf-8")
    )
      .replace(/\s/g, "")
      .replace(/\t/g, "")
      .replace(/\n/g, "");
    assert.equal(remoteManifest, remoteManifestExpeceted);

    const localManifestPath = path.join(appPackageFolderPath, "manifest.local.json");
    assert.isTrue(await fs.pathExists(localManifestPath));
    const localManifest = (await fs.readFile(localManifestPath, "utf-8"))
      .replace(/\s/g, "")
      .replace(/\t/g, "")
      .replace(/\n/g, "");
    const localManifestExpeceted = (
      await fs.readFile(path.join(projectPath, "expected", "manifest.local.json"), "utf-8")
    )
      .replace(/\s/g, "")
      .replace(/\t/g, "")
      .replace(/\n/g, "");
    assert.equal(localManifest, localManifestExpeceted);
  });

  it("happy path: aad manifest does not exist", async () => {
    const migrationContext = await mockMigrationContext(projectPath);

    // Stub
    sandbox.stub(migrationContext, "backup").resolves(true);
    await copyTestProject(Constants.manifestsMigrationHappyPathWithoutAad, projectPath);

    // Action
    await manifestsMigration(migrationContext);

    // Assert
    const appPackageFolderPath = path.join(projectPath, "appPackage");
    assert.isTrue(await fs.pathExists(appPackageFolderPath));

    const resourcesPath = path.join(appPackageFolderPath, "resources", "test.png");
    assert.isTrue(await fs.pathExists(resourcesPath));

    const manifestPath = path.join(appPackageFolderPath, "manifest.json");
    assert.isTrue(await fs.pathExists(manifestPath));
    const manifest = (await fs.readFile(manifestPath, "utf-8"))
      .replace(/\s/g, "")
      .replace(/\t/g, "")
      .replace(/\n/g, "");
    const manifestExpeceted = (
      await fs.readFile(path.join(projectPath, "expected", "manifest.json"), "utf-8")
    )
      .replace(/\s/g, "")
      .replace(/\t/g, "")
      .replace(/\n/g, "");
    assert.equal(manifest, manifestExpeceted);

    const aadManifestPath = path.join(projectPath, "aad.manifest.template.json");
    assert.isFalse(await fs.pathExists(aadManifestPath));
  });

  it("happy path: project created with ttk <= 4.0.0 with single teams app manifest", async () => {
    const migrationContext = await mockMigrationContext(projectPath);

    // Stub
    sandbox.stub(migrationContext, "backup").resolves(true);
    await copyTestProject(Constants.manifestsMigrationHappyPathOld, projectPath);

    try {
      await manifestsMigration(migrationContext);
    } catch (error) {
      assert.equal(error.name, errorNames.aadManifestTemplateNotExist);
    }
  });

  it("happy path: project created with ttk <= 4.0.0 with two teams app manifest", async () => {
    const migrationContext = await mockMigrationContext(projectPath);

    // Stub
    sandbox.stub(migrationContext, "backup").resolves(true);
    await copyTestProject(Constants.manifestsMigrationHappyPathOld, projectPath);
    await fs.rename(
      path.join(projectPath, "templates", "appPackage", "manifest.template.json"),
      path.join(projectPath, "templates", "appPackage", "manifest.local.template.json")
    );
    await fs.copy(
      path.join(projectPath, "templates", "appPackage", "manifest.local.template.json"),
      path.join(projectPath, "templates", "appPackage", "manifest.remote.template.json")
    );

    try {
      await manifestsMigration(migrationContext);
    } catch (error) {
      assert.equal(error.name, errorNames.manifestTemplateNotExist);
    }
  });

  it("migrate manifests failed: appPackage does not exist", async () => {
    const migrationContext = await mockMigrationContext(projectPath);

    // Stub
    sandbox.stub(migrationContext, "backup").resolves(false);

    try {
      await manifestsMigration(migrationContext);
    } catch (error) {
      assert.equal(error.name, errorNames.appPackageNotExist);
      assert.equal(error.innerError.message, "templates/appPackage does not exist");
    }
  });

  it("migrate manifests success: provision.bicep does not exist", async () => {
    const migrationContext = await mockMigrationContext(projectPath);

    // Stub
    sandbox.stub(migrationContext, "backup").resolves(true);
    await copyTestProject(Constants.manifestsMigrationHappyPath, projectPath);
    await fs.remove(path.join(projectPath, "templates", "azure", "provision.bicep"));

    // Action
    await manifestsMigration(migrationContext);

    // Assert
    const appPackageFolderPath = path.join(projectPath, "appPackage");
    assert.isTrue(await fs.pathExists(appPackageFolderPath));

    const resourcesPath = path.join(appPackageFolderPath, "resources", "test.png");
    assert.isTrue(await fs.pathExists(resourcesPath));
  });

  it("migrate manifests failed: teams app manifest does not exist", async () => {
    const migrationContext = await mockMigrationContext(projectPath);

    // Stub
    sandbox.stub(migrationContext, "backup").resolves(true);
    await copyTestProject(Constants.manifestsMigrationHappyPath, projectPath);
    await fs.remove(path.join(projectPath, "templates/appPackage/manifest.template.json"));

    try {
      await manifestsMigration(migrationContext);
    } catch (error) {
      assert.equal(error.name, errorNames.manifestTemplateNotExist);
      assert.equal(
        error.innerError.message,
        "templates/appPackage/manifest.template.json does not exist. You may be trying to upgrade a project created by Teams Toolkit for Visual Studio Code v3.x / Teams Toolkit CLI v0.x / Teams Toolkit for Visual Studio v17.3. Please install Teams Toolkit for Visual Studio Code v4.x / Teams Toolkit CLI v1.x / Teams Toolkit for Visual Studio v17.4 and run upgrade first."
      );
    }
  });
});

describe("azureParameterMigration", () => {
  const sandbox = sinon.createSandbox();
  const appName = randomAppName();
  const projectPath = path.join(os.tmpdir(), appName);

  beforeEach(async () => {
    await fs.ensureDir(projectPath);
  });

  afterEach(async () => {
    await fs.remove(projectPath);
    sandbox.restore();
  });

  it("Happy Path", async () => {
    const migrationContext = await mockMigrationContext(projectPath);

    // Stub
    await copyTestProject(Constants.manifestsMigrationHappyPath, projectPath);

    // Action
    await azureParameterMigration(migrationContext);

    // Assert
    const azureParameterDevFilePath = path.join(
      projectPath,
      "templates",
      "azure",
      "azure.parameters.dev.json"
    );
    const azureParameterTestFilePath = path.join(
      projectPath,
      "templates",
      "azure",
      "azure.parameters.test.json"
    );
    assert.isTrue(await fs.pathExists(azureParameterDevFilePath));
    assert.isTrue(await fs.pathExists(azureParameterTestFilePath));
    const azureParameterExpected = await fs.readFile(
      path.join(projectPath, "expected", "azure.parameters.json"),
      "utf-8"
    );
    const azureParameterDev = await fs.readFile(azureParameterDevFilePath, "utf-8");
    const azureParameterTest = await fs.readFile(azureParameterTestFilePath, "utf-8");
    assert.equal(azureParameterDev, azureParameterExpected);
    assert.equal(azureParameterTest, azureParameterExpected);
  });

  it("migrate azure.parameter failed: .fx/config does not exist", async () => {
    const migrationContext = await mockMigrationContext(projectPath);

    // Action
    await azureParameterMigration(migrationContext);

    // Assert
    const azureParameterDevFilePath = path.join(
      projectPath,
      "templates",
      "azure",
      "azure.parameters.dev.json"
    );
    assert.isFalse(await fs.pathExists(azureParameterDevFilePath));
  });

  it("migrate azure.parameter failed: provision.bicep does not exist", async () => {
    const migrationContext = await mockMigrationContext(projectPath);

    // Stub
    await fs.ensureDir(path.join(projectPath, ".fx", "config"));

    try {
      await azureParameterMigration(migrationContext);
    } catch (error) {
      assert.equal(error.name, "MigrationReadFileError");
      assert.equal(error.innerError.message, "templates/azure/provision.bicep does not exist");
    }
  });
});

describe("updateLaunchJson", () => {
  const appName = randomAppName();
  const projectPath = path.join(os.tmpdir(), appName);

  beforeEach(async () => {
    await fs.ensureDir(projectPath);
  });

  afterEach(async () => {
    await fs.remove(projectPath);
  });

  it("should success in happy path", async () => {
    const migrationContext = await mockMigrationContext(projectPath);
    await copyTestProject(Constants.happyPathTestProject, projectPath);

    await updateLaunchJson(migrationContext);

    assert.isTrue(await fs.pathExists(path.join(projectPath, backupFolder, ".vscode/launch.json")));
    const updatedLaunchJson = await fs.readJson(path.join(projectPath, Constants.launchJsonPath));
    assert.equal(
      updatedLaunchJson.configurations[0].url,
      "https://teams.microsoft.com/l/app/${{TEAMS_APP_ID}}?installAppPackage=true&webjoin=true&${account-hint}"
    );
    assert.equal(
      updatedLaunchJson.configurations[1].url,
      "https://teams.microsoft.com/l/app/${{TEAMS_APP_ID}}?installAppPackage=true&webjoin=true&${account-hint}"
    );
    assert.equal(
      updatedLaunchJson.configurations[2].url,
      "https://teams.microsoft.com/l/app/${{local:TEAMS_APP_ID}}?installAppPackage=true&webjoin=true&${account-hint}"
    );
    assert.equal(
      updatedLaunchJson.configurations[3].url,
      "https://teams.microsoft.com/l/app/${{local:TEAMS_APP_ID}}?installAppPackage=true&webjoin=true&${account-hint}"
    );
  });

  ["transparent-m365-tab", "transparent-m365-me"].forEach((testCase) => {
    it(testCase, async () => {
      const migrationContext = await mockMigrationContext(projectPath);
      await copyTestProject(path.join("debug", testCase), projectPath);

      await updateLaunchJson(migrationContext);

      assert.equal(
        await fs.readFile(path.join(projectPath, ".vscode", "launch.json"), "utf-8"),
        await fs.readFile(path.join(projectPath, "expected", "launch.json"), "utf-8")
      );
    });
  });
});

describe("generateAppYml-m365", () => {
  const appName = randomAppName();
  const projectPath = path.join(os.tmpdir(), appName);

  ["transparent-m365-tab", "transparent-m365-me"].forEach((testCase) => {
    it(testCase, async () => {
      const migrationContext = await mockMigrationContext(projectPath);
      await copyTestProject(path.join("debug", testCase), projectPath);

      await generateAppYml(migrationContext);

      assert.equal(
        await fs.readFile(path.join(projectPath, "teamsapp.yml"), "utf-8"),
        await fs.readFile(path.join(projectPath, "expected", "app.yml"), "utf-8")
      );
    });
  });
});

describe("stateMigration", () => {
  const appName = randomAppName();
  const projectPath = path.join(os.tmpdir(), appName);

  beforeEach(async () => {
    await fs.ensureDir(projectPath);
  });

  afterEach(async () => {
    await fs.remove(projectPath);
  });

  it("happy path", async () => {
    const migrationContext = await mockMigrationContext(projectPath);

    await copyTestProject(Constants.happyPathTestProject, projectPath);
    await statesMigration(migrationContext);

    assert.isTrue(await fs.pathExists(path.join(projectPath, Constants.environmentFolder)));

    const trueEnvContent_dev = await readEnvFile(
      getTestAssetsPath(path.join(Constants.happyPathTestProject, "testCaseFiles")),
      "state.dev"
    );
    assert.isTrue(
      await fs.pathExists(path.join(projectPath, Constants.environmentFolder, ".env.dev"))
    );
    const testEnvContent_dev = await readEnvFile(
      path.join(projectPath, Constants.environmentFolder),
      "dev"
    );
    assert.equal(testEnvContent_dev, trueEnvContent_dev);

    const trueEnvContent_local = await readEnvFile(
      getTestAssetsPath(path.join(Constants.happyPathTestProject, "testCaseFiles")),
      "state.local"
    );
    assert.isTrue(
      await fs.pathExists(path.join(projectPath, Constants.environmentFolder, ".env.local"))
    );
    const testEnvContent_local = await readEnvFile(
      path.join(projectPath, Constants.environmentFolder),
      "local"
    );
    assert.equal(testEnvContent_local, trueEnvContent_local);
  });
});

describe("configMigration", () => {
  const appName = randomAppName();
  const projectPath = path.join(os.tmpdir(), appName);

  beforeEach(async () => {
    await fs.ensureDir(projectPath);
  });

  afterEach(async () => {
    await fs.remove(projectPath);
  });

  it("happy path", async () => {
    const migrationContext = await mockMigrationContext(projectPath);

    await copyTestProject(Constants.happyPathTestProject, projectPath);
    await configsMigration(migrationContext);

    assert.isTrue(await fs.pathExists(path.join(projectPath, Constants.environmentFolder)));

    const trueEnvContent_dev = await readEnvFile(
      getTestAssetsPath(path.join(Constants.happyPathTestProject, "testCaseFiles")),
      "config.dev"
    );
    assert.isTrue(
      await fs.pathExists(path.join(projectPath, Constants.environmentFolder, ".env.dev"))
    );
    const testEnvContent_dev = await readEnvFile(
      path.join(projectPath, Constants.environmentFolder),
      "dev"
    );
    assert.equal(testEnvContent_dev, trueEnvContent_dev);

    const trueEnvContent_local = await readEnvFile(
      getTestAssetsPath(path.join(Constants.happyPathTestProject, "testCaseFiles")),
      "config.local"
    );
    assert.isTrue(
      await fs.pathExists(path.join(projectPath, Constants.environmentFolder, ".env.local"))
    );
    const testEnvContent_local = await readEnvFile(
      path.join(projectPath, Constants.environmentFolder),
      "local"
    );
    assert.equal(testEnvContent_local, trueEnvContent_local);
  });
});

describe("userdataMigration", () => {
  const appName = randomAppName();
  const projectPath = path.join(os.tmpdir(), appName);
  const sandbox = sinon.createSandbox();

  beforeEach(async () => {
    await fs.ensureDir(projectPath);
  });

  afterEach(async () => {
    await fs.remove(projectPath);
    sandbox.restore();
  });

  it("happy path for userdata migration", async () => {
    const migrationContext = await mockMigrationContext(projectPath);

    await copyTestProject(Constants.happyPathTestProject, projectPath);
    await userdataMigration(migrationContext);

    assert.isTrue(await fs.pathExists(path.join(projectPath, Constants.environmentFolder)));

    const trueEnvContent_dev = await readEnvFile(
      getTestAssetsPath(path.join(Constants.happyPathTestProject, "testCaseFiles")),
      "userdata.dev"
    );
    assert.isTrue(
      await fs.pathExists(
        path.join(projectPath, Constants.environmentFolder, buildEnvUserFileName("dev"))
      )
    );
    const testEnvContent_dev = await readEnvUserFile(
      path.join(projectPath, Constants.environmentFolder),
      "dev"
    );
    assert.equal(testEnvContent_dev, trueEnvContent_dev);

    const trueEnvContent_local = await readEnvFile(
      getTestAssetsPath(path.join(Constants.happyPathTestProject, "testCaseFiles")),
      "userdata.local"
    );
    assert.isTrue(
      await fs.pathExists(
        path.join(projectPath, Constants.environmentFolder, buildEnvUserFileName("local"))
      )
    );
    const testEnvContent_local = await readEnvUserFile(
      path.join(projectPath, Constants.environmentFolder),
      "local"
    );
    assert.equal(testEnvContent_local, trueEnvContent_local);
  });

  it("Should successfully resolve different EOLs of userdata", async () => {
    sandbox
      .stub(fs, "readFileSync")
      .returns(
        "fx-resource-aad-app-for-teams.clientSecret=abcd\nfx-resource-bot.botPassword=1234\n"
      );

    const migrationContext = await mockMigrationContext(projectPath);
    await copyTestProject(Constants.happyPathTestProject, projectPath);
    await userdataMigration(migrationContext);
    sandbox.restore(); // in case that assertFileContent uses readFileSync

    await assertFileContent(
      projectPath,
      path.join(Constants.environmentFolder, buildEnvUserFileName("dev")),
      "userdataenv"
    );
  });
});

describe("generateApimPluginEnvContent", () => {
  const appName = randomAppName();
  const projectPath = path.join(os.tmpdir(), appName);
  const sandbox = sinon.createSandbox();

  beforeEach(async () => {
    await fs.ensureDir(projectPath);
  });

  afterEach(async () => {
    await fs.remove(projectPath);
    sandbox.restore();
  });

  it("happy path", async () => {
    const migrationContext = await mockMigrationContext(projectPath);

    await copyTestProject(Constants.happyPathTestProject, projectPath);
    await generateApimPluginEnvContent(migrationContext);

    assert.isTrue(await fs.pathExists(path.join(projectPath, Constants.environmentFolder)));

    const trueEnvContent_dev = await readEnvFile(
      getTestAssetsPath(path.join(Constants.happyPathTestProject, "testCaseFiles")),
      "apimPlugin.dev"
    );
    assert.isTrue(
      await fs.pathExists(path.join(projectPath, Constants.environmentFolder, ".env.dev"))
    );
    const testEnvContent_dev = await readEnvFile(
      path.join(projectPath, Constants.environmentFolder),
      "dev"
    );
    assert.equal(testEnvContent_dev, trueEnvContent_dev);
  });

  it("checkapimPluginExists: apim exists", () => {
    const pjSettings_1 = {
      appName: "testapp",
      components: [
        {
          name: "teams-tab",
        },
        {
          name: "apim",
        },
      ],
    };
    assert.isTrue(checkapimPluginExists(pjSettings_1));
  });

  it("checkapimPluginExists: apim not exists", () => {
    const pjSettings_2 = {
      appName: "testapp",
      components: [
        {
          name: "teams-tab",
        },
      ],
    };
    assert.isFalse(checkapimPluginExists(pjSettings_2));
  });

  it("checkapimPluginExists: components not exists", () => {
    const pjSettings_3 = {
      appName: "testapp",
    };
    assert.isFalse(checkapimPluginExists(pjSettings_3));
  });

  it("checkapimPluginExists: obj null", () => {
    const pjSettings_4 = null;
    assert.isFalse(checkapimPluginExists(pjSettings_4));
  });
});

describe("allEnvMigration", () => {
  const appName = randomAppName();
  const projectPath = path.join(os.tmpdir(), appName);

  beforeEach(async () => {
    await fs.ensureDir(projectPath);
  });

  afterEach(async () => {
    await fs.remove(projectPath);
  });

  it("happy path for all env migration", async () => {
    const migrationContext = await mockMigrationContext(projectPath);

    await copyTestProject(Constants.happyPathTestProject, projectPath);
    await configsMigration(migrationContext);
    await statesMigration(migrationContext);
    await userdataMigration(migrationContext);
    await generateApimPluginEnvContent(migrationContext);

    assert.isTrue(await fs.pathExists(path.join(projectPath, Constants.environmentFolder)));

    const trueEnvContent_dev = await readEnvFile(
      getTestAssetsPath(path.join(Constants.happyPathTestProject, "testCaseFiles")),
      "all.dev"
    );
    assert.isTrue(
      await fs.pathExists(path.join(projectPath, Constants.environmentFolder, ".env.dev"))
    );
    const testEnvContent_dev = await readEnvFile(
      path.join(projectPath, Constants.environmentFolder),
      "dev"
    );
    assert.equal(testEnvContent_dev, trueEnvContent_dev);

    const trueEnvContent_local = await readEnvFile(
      getTestAssetsPath(path.join(Constants.happyPathTestProject, "testCaseFiles")),
      "all.local"
    );
    assert.isTrue(
      await fs.pathExists(path.join(projectPath, Constants.environmentFolder, ".env.local"))
    );
    const testEnvContent_local = await readEnvFile(
      path.join(projectPath, Constants.environmentFolder),
      "local"
    );
    assert.equal(testEnvContent_local, trueEnvContent_local);
  });
});

describe("Migration utils", () => {
  const appName = randomAppName();
  const projectPath = path.join(os.tmpdir(), appName);
  const sandbox = sinon.createSandbox();

  beforeEach(async () => {
    await fs.ensureDir(projectPath);
  });

  afterEach(async () => {
    await fs.remove(projectPath);
    sandbox.restore();
  });

  it("checkVersionForMigration V2", async () => {
    const migrationContext = await mockMigrationContext(projectPath);
    await copyTestProject(Constants.happyPathTestProject, projectPath);
    const state = await checkVersionForMigration(migrationContext);
    assert.equal(state.state, VersionState.upgradeable);
  });

  it("checkVersionForMigration V3", async () => {
    const migrationContext = await mockMigrationContext(projectPath);
    await copyTestProject(Constants.happyPathTestProject, projectPath);
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readFile").resolves("version: 1.0.0" as any);
    const state = await checkVersionForMigration(migrationContext);
    assert.equal(state.state, VersionState.compatible);
  });

  it("checkVersionForMigration V3 abandoned", async () => {
    const migrationContext = await mockMigrationContext(projectPath);
    await copyTestProject(Constants.happyPathTestProject, projectPath);
    sandbox.stub(loader, "getProjectSettingPathV2").returns("");
    sandbox.stub(loader, "getProjectSettingPathV3").returns("");
    sandbox.stub(fs, "pathExists").callsFake(async (path) => {
      return path ? true : false;
    });
    const state = await checkVersionForMigration(migrationContext);
    assert.equal(state.state, VersionState.unsupported);
  });

  it("checkVersionForMigration empty", async () => {
    const migrationContext = await mockMigrationContext(projectPath);
    await copyTestProject(Constants.happyPathTestProject, projectPath);
    sandbox.stub(fs, "pathExists").resolves(false);
    const state = await checkVersionForMigration(migrationContext);
    assert.equal(state.state, VersionState.unsupported);
  });

  it("UpgradeCanceledError", () => {
    const err = UpgradeCanceledError();
    assert.isNotNull(err);
  });

  it("getTrackingIdFromPath: V2 ", async () => {
    sandbox.stub(fs, "pathExists").callsFake(async (path: string) => {
      if (path === getProjectSettingPathV3(projectPath)) {
        return false;
      }
      return true;
    });
    sandbox.stub(fs, "readJson").resolves({ projectId: mockedId });
    const trackingId = await getTrackingIdFromPath(projectPath);
    assert.equal(trackingId, mockedId);
  });

  it("getTrackingIdFromPath: V3 ", async () => {
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(SettingsUtils.prototype, "readSettings").resolves(
      ok({
        version: MetadataV3.projectVersion,
        trackingId: mockedId,
      })
    );
    const trackingId = await getTrackingIdFromPath(projectPath);
    assert.equal(trackingId, mockedId);
  });

  it("getTrackingIdFromPath: V3 failed", async () => {
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox
      .stub(SettingsUtils.prototype, "readSettings")
      .resolves(err(new Error("mocked error") as FxError));
    const trackingId = await getTrackingIdFromPath(projectPath);
    assert.equal(trackingId, "");
  });

  it("getTrackingIdFromPath: empty", async () => {
    sandbox.stub(fs, "pathExists").resolves(false);
    const trackingId = await getTrackingIdFromPath(projectPath);
    assert.equal(trackingId, "");
  });

  it("getTrackingIdFromPath: empty", async () => {
    sandbox.stub(fs, "pathExists").resolves(false);
    const trackingId = await getTrackingIdFromPath(projectPath);
    assert.equal(trackingId, "");
  });

  it("getVersionState", () => {
    assert.equal(
      getVersionState({
        version: "2.0.0",
        source: VersionSource.projectSettings,
      }),
      VersionState.upgradeable
    );
    assert.equal(
      getVersionState({
        version: "1.0.0",
        source: VersionSource.teamsapp,
      }),
      VersionState.compatible
    );
    assert.equal(
      getVersionState({
        version: "",
        source: VersionSource.unknown,
      }),
      VersionState.unsupported
    );
  });

  it("getDownloadLinkByVersionAndPlatform", () => {
    assert.equal(
      getDownloadLinkByVersionAndPlatform("2.0.0", Platform.VS),
      `${Metadata.versionMatchLink}#visual-studio`
    );
    assert.equal(
      getDownloadLinkByVersionAndPlatform("2.0.0", Platform.CLI),
      `${Metadata.versionMatchLink}#cli`
    );
    assert.equal(
      getDownloadLinkByVersionAndPlatform("2.0.0", Platform.VSCode),
      `${Metadata.versionMatchLink}#vscode`
    );
  });

  it("outputCancelMessage", () => {
    outputCancelMessage("2.0.0", Platform.VS);
    outputCancelMessage("2.0.0", Platform.CLI);
    outputCancelMessage("2.0.0", Platform.VSCode);
  });

  it("migrationNotificationMessage", () => {
    const tools = new MockTools();
    setTools(tools);

    const version: VersionForMigration = {
      currentVersion: "2.0.0",
      source: VersionSource.projectSettings,
      state: VersionState.upgradeable,
      platform: Platform.VS,
    };

    migrationNotificationMessage(version);
    version.platform = Platform.VSCode;
    migrationNotificationMessage(version);
    version.platform = Platform.CLI;
    migrationNotificationMessage(version);
  });
});

describe("Migration show notification", () => {
  const appName = randomAppName();
  const projectPath = path.join(os.tmpdir(), appName);
  const sandbox = sinon.createSandbox();
  const inputs: Inputs = {
    platform: Platform.VSCode,
    ignoreEnvInfo: true,
    projectPath: projectPath,
  };
  const coreCtx = {
    arguments: [inputs],
  };
  const version: VersionForMigration = {
    currentVersion: "2.0.0",
    source: VersionSource.projectSettings,
    state: VersionState.upgradeable,
    platform: Platform.VSCode,
  };

  beforeEach(async () => {
    inputs["isNonmodalMessage"] = "";
    inputs["confirmOnly"] = "";
    inputs["skipUserConfirm"] = "";
    sandbox.stub(MockUserInteraction.prototype, "openUrl").resolves(ok(true));
    await fs.ensureDir(projectPath);
  });

  afterEach(async () => {
    await fs.remove(projectPath);
    sandbox.restore();
  });

  it("nonmodal case and click upgrade", async () => {
    inputs.isNonmodalMessage = "true";
    sandbox.stub(MockUserInteraction.prototype, "showMessage").resolves(ok("Upgrade"));
    const res = await MigratorV3.showNotification(coreCtx, version);
    assert.isTrue(res);
  });

  it("nonmodal case and click More Info", async () => {
    inputs.isNonmodalMessage = "true";
    sandbox.stub(MockUserInteraction.prototype, "showMessage").resolves(ok("More Info"));
    const res = await MigratorV3.showNotification(coreCtx, version);
    assert.isFalse(res);
  });

  it("nonmodal case and click nothing", async () => {
    inputs.isNonmodalMessage = "true";
    sandbox.stub(MockUserInteraction.prototype, "showMessage").resolves(ok(""));
    const res = await MigratorV3.showNotification(coreCtx, version);
    assert.isFalse(res);
  });

  it("confirmOnly case and click OK", async () => {
    inputs.confirmOnly = "true";
    sandbox.stub(MockUserInteraction.prototype, "showMessage").resolves(ok("OK"));
    const res = await MigratorV3.showNotification(coreCtx, version);
    assert.isTrue(res);
  });

  it("confirmOnly case and click cancel", async () => {
    inputs.confirmOnly = "true";
    sandbox.stub(MockUserInteraction.prototype, "showMessage").resolves(ok("cancel"));
    const res = await MigratorV3.showNotification(coreCtx, version);
    assert.isFalse(res);
  });

  it("skipUserConfirm case", async () => {
    inputs.skipUserConfirm = "true";
    const res = await MigratorV3.showNotification(coreCtx, version);
    assert.isTrue(res);
  });
});

describe("debugMigration", () => {
  const appName = randomAppName();
  const projectPath = path.join(os.tmpdir(), appName);

  beforeEach(async () => {
    await fs.ensureDir(projectPath);
    sinon.stub(debugV3MigrationUtils, "updateLocalEnv").callsFake(async () => {});
  });

  afterEach(async () => {
    await fs.remove(projectPath);
    sinon.restore();
  });

  const testCases = [
    "transparent-tab",
    "transparent-sso-tab",
    "transparent-bot",
    "transparent-sso-bot",
    "transparent-notification",
    "transparent-tab-bot-func",
    "transparent-m365-tab",
    "transparent-m365-me",
    "beforeV3.4.0-tab",
    "beforeV3.4.0-bot",
    "beforeV3.4.0-tab-bot-func",
    "V3.5.0-V4.0.6-tab",
    "V3.5.0-V4.0.6-tab-bot-func",
    "V3.5.0-V4.0.6-notification-trigger",
    "V3.5.0-V4.0.6-command",
  ];

  const simpleAuthPath = path.join(os.homedir(), ".fx", "localauth").replace(/\\/g, "\\\\");
  const simpleAuthAppsettingsPath = path.join(
    os.homedir(),
    ".fx",
    "localauth",
    "appsettings.Development.json"
  );

  testCases.forEach((testCase) => {
    it(testCase, async () => {
      const migrationContext = await mockMigrationContext(projectPath);

      await copyTestProject(path.join("debug", testCase), projectPath);

      await debugMigration(migrationContext);

      assert.equal(
        await fs.readFile(path.join(projectPath, "teamsapp.local.yml"), "utf-8"),
        (await fs.readFile(path.join(projectPath, "expected", "app.local.yml"), "utf-8")).replace(
          "SIMPLE_AUTH_APPSETTINGS_PATH",
          simpleAuthAppsettingsPath
        )
      );
      assert.equal(
        await fs.readFile(path.join(projectPath, ".vscode", "tasks.json"), "utf-8"),
        (await fs.readFile(path.join(projectPath, "expected", "tasks.json"), "utf-8")).replace(
          "SIMPLE_AUTH_PATH",
          simpleAuthPath
        )
      );
    });
  });
});

describe("updateGitignore", async () => {
  const appName = randomAppName();
  const projectPath = path.join(os.tmpdir(), appName);
  const migrationContext: MigrationContext = await mockMigrationContext(projectPath);

  beforeEach(async () => {
    await fs.ensureDir(projectPath);
  });

  afterEach(async () => {
    await fs.remove(projectPath);
  });

  it("should update existing gitignore file", async () => {
    await copyTestProject("happyPath", projectPath);

    await generateAppYml(migrationContext);

    await assertFileContent(projectPath, ".gitignore", "whenGitignoreExist");
  });

  it("should create new gitignore file when no gitignore file exists", async () => {
    await copyTestProject("happyPath", projectPath);
    await fs.remove(path.join(projectPath, ".gitignore"));

    await generateAppYml(migrationContext);

    await assertFileContent(projectPath, ".gitignore", "whenGitignoreNotExist");
  });
});

export async function mockMigrationContext(projectPath: string): Promise<MigrationContext> {
  const inputs: Inputs = { platform: Platform.VSCode, ignoreEnvInfo: true };
  inputs.projectPath = projectPath;
  const ctx = {
    arguments: [inputs],
  };
  return await MigrationContext.create(ctx);
}

function getTestAssetsPath(projectName: string): string {
  return path.join("tests/core/middleware/testAssets/v3Migration", projectName.toString());
}

// Change CRLF to LF to avoid test failures in different OS
function normalizeLineBreaks(content: string): string {
  return content.replace(/\r\n/g, "\n");
}

async function assertFileContent(
  projectPath: string,
  actualFilePath: string,
  expectedFileName: string
): Promise<void> {
  const actualFileFullPath = path.join(projectPath, actualFilePath);
  const expectedFileFulePath = path.join(projectPath, "expectedResult", expectedFileName);
  assert.isTrue(await fs.pathExists(actualFileFullPath));
  const actualFileContent = normalizeLineBreaks(await fs.readFile(actualFileFullPath, "utf8"));
  const expectedFileContent = normalizeLineBreaks(await fs.readFile(expectedFileFulePath, "utf8"));
  assert.equal(actualFileContent, expectedFileContent);
}

async function copyTestProject(projectName: string, targetPath: string): Promise<void> {
  await fs.copy(getTestAssetsPath(projectName), targetPath);
}

async function readOldProjectSettings(projectPath: string): Promise<any> {
  return await fs.readJson(path.join(projectPath, Constants.oldProjectSettingsFilePath));
}

async function readSettingJson(projectPath: string): Promise<any> {
  return await fs.readJson(path.join(projectPath, Constants.settingsFilePath));
}

async function readEnvFile(projectPath: string, env: string): Promise<any> {
  return await fs.readFileSync(path.join(projectPath, ".env." + env)).toString();
}

async function readEnvUserFile(projectPath: string, env: string): Promise<any> {
  return await fs.readFileSync(path.join(projectPath, buildEnvUserFileName(env))).toString();
}

function getAction(lifecycleDefinition: Array<any>, actionName: string): any[] {
  if (lifecycleDefinition) {
    return lifecycleDefinition.filter((item) => item.uses === actionName);
  }
  return [];
}

const Constants = {
  happyPathTestProject: "happyPath",
  settingsFilePath: "teamsfx/settings.json",
  oldProjectSettingsFilePath: ".fx/configs/projectSettings.json",
  appYmlPath: "teamsapp.yml",
  manifestsMigrationHappyPath: "manifestsHappyPath",
  manifestsMigrationHappyPathWithoutAad: "manifestsHappyPathWithoutAad",
  manifestsMigrationHappyPathSpfx: "manifestsHappyPathSpfx",
  manifestsMigrationHappyPathOld: "manifestsMigrationHappyPathOld",
  launchJsonPath: ".vscode/launch.json",
  happyPathWithoutFx: "happyPath_for_needMigrateToAadManifest/happyPath_no_fx",
  happyPathAadManifestTemplateExist:
    "happyPath_for_needMigrateToAadManifest/happyPath_aadManifestTemplateExist",
  happyPathWithoutPermission: "happyPath_for_needMigrateToAadManifest/happyPath_no_permissionFile",
  happyPathAadPluginNotActive:
    "happyPath_for_needMigrateToAadManifest/happyPath_aadPluginNotActive",
  environmentFolder: "env",
};
