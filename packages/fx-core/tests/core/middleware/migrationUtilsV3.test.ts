import { assert } from "chai";
import path from "path";
import fs from "fs-extra";
import * as os from "os";
import {
  convertPluginId,
  FileType,
  fixedNamingsV3,
  namingConverterV3,
} from "../../../src/core/middleware/utils/MigrationUtils";
import {
  generateAppIdUri,
  jsonObjectNamesConvertV3,
  readBicepContent,
  readJsonFile,
} from "../../../src/core/middleware/utils/v3MigrationUtils";
import { randomAppName } from "../utils";
import {
  copyTestProject,
  getTestAssetsPath,
  mockMigrationContext,
  readEnvFile,
} from "./projectMigrationV3.test";

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
    assert.isTrue(
      res.isErr() &&
        res.error.message ===
          "Failed to find matching output in provision.bicep for key state.fx-resource-azure-sql.databaseName_test3" &&
        res.error.name == "FailedToConvertV2ConfigNameToV3"
    );
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

describe("v3MigrationUtils.ts: jsonObjectNamesConvertV3", () => {
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
    await copyTestProject("happyPath", projectPath);
    const obj = await readJsonFile(migrationContext, path.join(".fx", "states", "state.dev.json"));
    if (obj) {
      const bicepContent = readBicepContent(migrationContext);
      const testData = jsonObjectNamesConvertV3(obj, "state.", "", FileType.STATE, bicepContent);
      const trueData = await readEnvFile(
        getTestAssetsPath(path.join("happyPath", "testCaseFiles")),
        "state.dev"
      );
      assert.equal(testData, trueData);
    }
  });
});
