import { assert } from "chai";
import {
  FileType,
  fixedNamingsV3,
  namingConverterV3,
} from "../../../src/core/middleware/MigrationUtils";

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

  it("happy path for provision outputs: state.fx-resource-frontend-hosting.domain", () => {
    const bicepContent =
      "output azureStorageTabOutput object = {\nteamsFxPluginId: 'fx-resource-frontend-hosting'\n}";
    const res = namingConverterV3(
      "state.fx-resource-frontend-hosting.domain",
      FileType.STATE,
      bicepContent
    );
    assert.isTrue(res.isOk() && res.value === "PROVISIONOUTPUT__AZURESTORAGETABOUTPUT__DOMAIN");
  });

  it("happy path for provision outputs: state.fx-resource-azure-sql.databaseName with single database", () => {
    const bicepContent =
      "output azureSqlOutput object = {\nteamsFxPluginId: 'fx-resource-azure-sql'\n}";
    const res = namingConverterV3(
      "state.fx-resource-azure-sql.databaseName",
      FileType.STATE,
      bicepContent
    );
    assert.isTrue(res.isOk() && res.value === "PROVISIONOUTPUT__AZURESQLOUTPUT__DATABASENAME");
  });

  it("happy path for provision outputs: state.fx-resource-azure-sql.databaseName with multiple database", () => {
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
