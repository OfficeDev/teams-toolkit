import { assert } from "chai";
import fs from "fs-extra";
import {
  convertPluginId,
  FileType,
  fixedNamingsV3,
  namingConverterV3,
  needMigrateToAadManifest,
} from "../../../src/core/middleware/utils/MigrationUtils";
import {
  generateAppIdUri,
  getTemplateFolderPath,
} from "../../../src/core/middleware/utils/v3MigrationUtils";
import { randomAppName } from "../utils";
import * as os from "os";
import * as path from "path";
import * as v3MigrationUtils from "../../../src/core/middleware/utils/v3MigrationUtils";
import * as migrationUtils from "../../../src/core/middleware/utils/MigrationUtils";
import { err, Inputs, Platform, SystemError } from "@microsoft/teamsfx-api";
import { MigrationContext } from "../../../src/core/middleware/utils/migrationContext";
import { mockMigrationContext } from "./projectMigrationV3.test";
import sinon from "sinon";
import { getPlaceholderMappings } from "../../../src/core/middleware/utils/debug/debugV3MigrationUtils";
import { setTools, TOOLS } from "../../../src/core/globalVars";

describe("MigrationUtilsV3", () => {
  it("happy path for fixed namings", () => {
    Object.keys(fixedNamingsV3).forEach((name) => {
      const res = namingConverterV3(name, FileType.STATE, "");
      assert.isTrue(res.isOk() && res.value === fixedNamingsV3[name]);
    });
  });

  it("happy path for common properties in state", () => {
    const res = namingConverterV3("fx-resource-test.test-plugin.test-key", FileType.STATE, "");
    assert.isTrue(res.isOk() && res.value === "FX_RESOURCE_TEST__TEST_PLUGIN__TEST_KEY");
  });

  it("happy path for common properties in config", () => {
    const res = namingConverterV3("fx-resource-test.test-plugin.test-key", FileType.CONFIG, "");
    assert.isTrue(res.isOk() && res.value === "CONFIG__FX_RESOURCE_TEST__TEST_PLUGIN__TEST_KEY");
  });

  it("happy path for common properties in userdata", () => {
    const res = namingConverterV3("fx-resource-test.test-plugin.test-key", FileType.USERDATA, "");
    assert.isTrue(res.isOk() && res.value === "SECRET_FX_RESOURCE_TEST__TEST_PLUGIN__TEST_KEY");
  });

  it("happy path for provision outputs: state.fx-resource-frontend-hosting.domain with standard pluginId", () => {
    const bicepContent =
      "output azureStorageTabOutput object = {\nteamsFxPluginId: 'fx-resource-frontend-hosting'\n}";
    const res = namingConverterV3(
      "state.fx-resource-frontend-hosting.domain",
      FileType.STATE,
      bicepContent
    );
    assert.isTrue(res.isOk() && res.value === "PROVISIONOUTPUT__AZURESTORAGETABOUTPUT__DOMAIN");
  });

  it("happy path for provision outputs: state.fx-resource-frontend-hosting.domain with updated pluginId", () => {
    const bicepContent = "output azureStorageTabOutput object = {\nteamsFxPluginId: 'teams-tab'\n}";
    const res = namingConverterV3(
      "state.fx-resource-frontend-hosting.domain",
      FileType.STATE,
      bicepContent
    );
    assert.isTrue(res.isOk() && res.value === "PROVISIONOUTPUT__AZURESTORAGETABOUTPUT__DOMAIN");
  });

  it("happy path for provision outputs: state.fx-resource-azure-sql.databaseName with single database and standard pluginId", () => {
    const bicepContent =
      "output azureSqlOutput object = {\nteamsFxPluginId: 'fx-resource-azure-sql'\n}";
    const res = namingConverterV3(
      "state.fx-resource-azure-sql.databaseName",
      FileType.STATE,
      bicepContent
    );
    assert.isTrue(res.isOk() && res.value === "PROVISIONOUTPUT__AZURESQLOUTPUT__DATABASENAME");
  });

  it("happy path for provision outputs: state.fx-resource-azure-sql.databaseName with single database and updated pluginId", () => {
    const bicepContent = "output azureSqlOutput object = {\nteamsFxPluginId: 'azure-sql'\n}";
    const res = namingConverterV3(
      "state.fx-resource-azure-sql.databaseName",
      FileType.STATE,
      bicepContent
    );
    assert.isTrue(res.isOk() && res.value === "PROVISIONOUTPUT__AZURESQLOUTPUT__DATABASENAME");
  });

  it("happy path for provision outputs: state.fx-resource-azure-sql.databaseName with multiple database and standard pluginId", () => {
    const bicepContent =
      "output azureSqlOutput object = {\nteamsFxPluginId: 'fx-resource-azure-sql'\n}\n" +
      "output azureSqlOutput_test object = {\nteamsFxPluginId: 'fx-resource-azure-sql'\n}" +
      "output azureSqlOutput_test2 object = {\nteamsFxPluginId: 'fx-resource-azure-sql'\n}";
    const res = namingConverterV3(
      "state.fx-resource-azure-sql.databaseName_test",
      FileType.STATE,
      bicepContent
    );
    assert.isTrue(
      res.isOk() && res.value === "PROVISIONOUTPUT__AZURESQLOUTPUT_TEST__DATABASENAME_TEST"
    );
  });

  it("happy path for provision outputs: state.fx-resource-azure-sql.databaseName with multiple database and updated pluginId", () => {
    const bicepContent =
      "output azureSqlOutput object = {\nteamsFxPluginId: 'azure-sql'\n}\n" +
      "output azureSqlOutput_test object = {\nteamsFxPluginId: 'azure-sql'\n}" +
      "output azureSqlOutput_test2 object = {\nteamsFxPluginId: 'azure-sql'\n}";
    const res = namingConverterV3(
      "state.fx-resource-azure-sql.databaseName_test",
      FileType.STATE,
      bicepContent
    );
    assert.isTrue(
      res.isOk() && res.value === "PROVISIONOUTPUT__AZURESQLOUTPUT_TEST__DATABASENAME_TEST"
    );
  });

  it("happy path for provision outputs with empty bicep content", () => {
    const res = namingConverterV3("state.fx-resource-frontend-hosting.domain", FileType.STATE, "");
    assert.isTrue(res.isOk() && res.value === "STATE__FX_RESOURCE_FRONTEND_HOSTING__DOMAIN");
  });

  it("failed to convert provision outputs: state.fx-resource-azure-sql.databaseName with multiple database", () => {
    const bicepContent =
      "output azureSqlOutput object = {\nteamsFxPluginId: 'fx-resource-azure-sql'\n}\n" +
      "output azureSqlOutput_test object = {\nteamsFxPluginId: 'fx-resource-azure-sql'\n}" +
      "output azureSqlOutput_test2 object = {\nteamsFxPluginId: 'fx-resource-azure-sql'\n}";
    const res = namingConverterV3(
      "state.fx-resource-azure-sql.databaseName_test3",
      FileType.STATE,
      bicepContent
    );
    assert.isTrue(res.isOk() && res.value === "STATE__FX_RESOURCE_AZURE_SQL__DATABASENAME_TEST3");
  });
});

describe("MigrationUtilsV3: generateAppIdUri", () => {
  it("TabSso", () => {
    const res = generateAppIdUri({
      TabSso: true,
      BotSso: false,
    });
    assert.equal(
      res,
      "api://{{state.fx-resource-frontend-hosting.domain}}/{{state.fx-resource-aad-app-for-teams.clientId}}"
    );
  });

  it("BotSso", () => {
    const res = generateAppIdUri({
      TabSso: false,
      BotSso: true,
    });
    assert.equal(res, "api://botid-{{state.fx-resource-bot.botId}}");
  });

  it("TabSso && BotSso", () => {
    const res = generateAppIdUri({
      TabSso: true,
      BotSso: true,
    });
    assert.equal(
      res,
      "api://{{state.fx-resource-frontend-hosting.domain}}/botid-{{state.fx-resource-bot.botId}}"
    );
  });

  it("Without SSO", () => {
    const res = generateAppIdUri({
      TabSso: false,
      BotSso: false,
    });
    assert.equal(res, "api://{{state.fx-resource-aad-app-for-teams.clientId}}");
  });
});

describe("MigrationUtilsV3: convertPluginId", () => {
  it("happy path", () => {
    const res = convertPluginId("state.aad-app.clientId");
    assert.equal(res, "state.fx-resource-aad-app-for-teams.clientId");
  });

  it("happy path without change", () => {
    const res = convertPluginId("state.fx-resource-aad-app-for-teams.clientId");
    assert.equal(res, "state.fx-resource-aad-app-for-teams.clientId");
  });

  it("happy path with short id", () => {
    const res = convertPluginId("test");
    assert.equal(res, "test");
  });
});

describe("MigrationUtils: needMigrateToAadManifest", async () => {
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

  it("fxEist false", async () => {
    const migrationContext = await mockMigrationContext(projectPath);
    sandbox
      .stub(fs, "pathExists")
      .withArgs(path.join(projectPath, ".fx"), () => {})
      .resolves(false);
    assert.isTrue(!(await needMigrateToAadManifest(migrationContext)));
  });

  it("aadManifestTemplateExist", async () => {
    const migrationContext = await mockMigrationContext(projectPath);
    sandbox
      .stub(fs, "pathExists")
      .withArgs(path.join(projectPath, ".fx"), () => {})
      .resolves(true)
      .withArgs(path.join(projectPath, "templates", "appPackage", "aad.template.json"), () => {})
      .resolves(true);
    assert.isTrue(!(await needMigrateToAadManifest(migrationContext)));
  });

  it("permissionFileExist false", async () => {
    const migrationContext = await mockMigrationContext(projectPath);
    sandbox
      .stub(fs, "pathExists")
      .withArgs(path.join(projectPath, ".fx"), () => {})
      .resolves(true)
      .withArgs(path.join(projectPath, "templates", "appPackage", "aad.template.json"), () => {})
      .resolves(false)
      .withArgs(path.join(projectPath, "permissions.json"), () => {})
      .resolves(false);
    assert.isTrue(!(await needMigrateToAadManifest(migrationContext)));
  });
});

describe("MigrationUtilsV3: getTemplateFolderPath", () => {
  const appName = randomAppName();
  const projectPath = path.join(os.tmpdir(), appName);

  it("happy path: vsc", async () => {
    const inputs: Inputs = { platform: Platform.VSCode, ignoreEnvInfo: true };
    inputs.projectPath = projectPath;
    const ctx = {
      arguments: [inputs],
    };
    const context = await MigrationContext.create(ctx);
    const templatePath = getTemplateFolderPath(context);
    assert.equal(templatePath, "templates");
  });

  it("happy path: vs", async () => {
    const inputs: Inputs = { platform: Platform.VS, ignoreEnvInfo: true };
    inputs.projectPath = projectPath;
    const ctx = {
      arguments: [inputs],
    };
    const context = await MigrationContext.create(ctx);
    const templatePath = getTemplateFolderPath(context);
    assert.equal(templatePath, "Templates");
  });
});

describe("MigrationUtils: needMigrateToAadManifest", async () => {
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

  it("fxEist false", async () => {
    const migrationContext = await mockMigrationContext(projectPath);
    sandbox
      .stub(fs, "pathExists")
      .withArgs(path.join(projectPath, ".fx"), () => {})
      .resolves(false);
    assert.isTrue(!(await needMigrateToAadManifest(migrationContext)));
  });

  it("aadManifestTemplateExist", async () => {
    const migrationContext = await mockMigrationContext(projectPath);
    sandbox
      .stub(fs, "pathExists")
      .withArgs(path.join(projectPath, ".fx"), () => {})
      .resolves(true)
      .withArgs(path.join(projectPath, "templates", "appPackage", "aad.template.json"), () => {})
      .resolves(true);
    assert.isTrue(!(await needMigrateToAadManifest(migrationContext)));
  });

  it("permissionFileExist false", async () => {
    const migrationContext = await mockMigrationContext(projectPath);
    sandbox
      .stub(fs, "pathExists")
      .withArgs(path.join(projectPath, ".fx"), () => {})
      .resolves(true)
      .withArgs(path.join(projectPath, "templates", "appPackage", "aad.template.json"), () => {})
      .resolves(false)
      .withArgs(path.join(projectPath, "permissions.json"), () => {})
      .resolves(false);
    assert.isTrue(!(await needMigrateToAadManifest(migrationContext)));
  });
});

describe("Migration: getPlaceholderMappings", () => {
  const sandbox = sinon.createSandbox();
  const appName = randomAppName();
  const projectPath = path.join(os.tmpdir(), appName);

  afterEach(() => {
    sandbox.restore();
  });

  it("failed due to naming converter throws error", async () => {
    sandbox.stub(v3MigrationUtils, "readBicepContent").resolves("");
    sandbox
      .stub(migrationUtils, "namingConverterV3")
      .returns(err(new SystemError("source", "name", "message")));
    const migrationContext = await mockMigrationContext(projectPath);
    const res = await getPlaceholderMappings(migrationContext);
    assert.equal(res.botDomain, undefined);
    assert.equal(res.tabIndexPath, undefined);
    assert.equal(res.tabEndpoint, undefined);
    assert.equal(res.tabDomain, undefined);
    assert.equal(res.botEndpoint, undefined);
  });
});

describe("Migration: upgrade cancel messages", () => {
  const sandbox = sinon.createSandbox();
  let messageArray: string[];

  beforeEach(() => {
    messageArray = [];
    sandbox.stub(TOOLS?.logProvider, "warning").callsFake(async (message) => {
      messageArray.push(message);
      return true;
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("vsc upgrade cancel log messages", () => {
    v3MigrationUtils.outputCancelMessage("4.2.2", Platform.VSCode);
    const groundTruth = [
      `Upgrade cancelled.`,
      `Notice upgrade to new configuration files is a must-have to continue to use current version Teams Toolkit. Learn more at https://aka.ms/teams-toolkit-5.0-upgrade.`,
      `If you want to upgrade, please run command (Teams: Upgrade project) or click the "Upgrade project" button on Teams Toolkit sidebar to trigger the upgrade.`,
      `If you are not ready to upgrade, please continue to use the old version Teams Toolkit 4.x.x.`,
    ];
    assert.equal(messageArray.join(""), groundTruth.join(""));
  });

  it("vs upgrade cancel log messages", () => {
    v3MigrationUtils.outputCancelMessage("4.2.2", Platform.VS);
    const groundTruth = [
      `Upgrade cancelled.`,
      `Notice upgrade to new configuration files is a must-have to continue to use current version Teams Toolkit. Learn more at https://aka.ms/teams-toolkit-5.0-upgrade.`,
      `If you want to upgrade, please trigger this command again.`,
      `If you are not ready to upgrade, please continue to use the old version Teams Toolkit 17.4.x.x.`,
    ];
    assert.equal(messageArray.join(""), groundTruth.join(""));
  });

  it("cli upgrade cancel log messages", () => {
    v3MigrationUtils.outputCancelMessage("4.2.2", Platform.CLI);
    const groundTruth = [
      `Upgrade cancelled.`,
      `Notice upgrade to new configuration files is a must-have to continue to use current version Teams Toolkit CLI. Learn more at https://aka.ms/teams-toolkit-5.0-upgrade.`,
      `If you want to upgrade, please trigger this command again.`,
      `If you are not ready to upgrade, please continue to use the old version Teams Toolkit CLI 1.x.x.`,
    ];
    assert.equal(messageArray.join(""), groundTruth.join(""));
  });

  it("undefined tools", () => {
    let undefinedTools: any;
    setTools(undefinedTools);
    v3MigrationUtils.outputCancelMessage("4.2.2", Platform.VS);
    const groundTruth = [""];
    assert.equal(messageArray.join(""), groundTruth.join(""));
  });
});
