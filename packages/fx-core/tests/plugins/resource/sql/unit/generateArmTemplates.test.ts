import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { TestHelper } from "../helper";
import { SqlPlugin } from "../../../../../src/plugins/resource/sql";
import * as dotenv from "dotenv";
import { AzureSolutionSettings, Platform, PluginContext } from "@microsoft/teamsfx-api";
import * as msRestNodeAuth from "@azure/ms-rest-nodeauth";
import * as faker from "faker";
import * as sinon from "sinon";
import fs from "fs-extra";
import * as path from "path";
import {
  ConstantString,
  mockSolutionGenerateArmTemplates,
  mockSolutionUpdateArmTemplates,
  ResourcePlugins,
} from "../../util";
chai.use(chaiAsPromised);

dotenv.config();

describe("generateArmTemplates", () => {
  let sqlPlugin: SqlPlugin;
  let pluginContext: PluginContext;
  let credentials: msRestNodeAuth.TokenCredentialsBase;

  before(async () => {
    credentials = new msRestNodeAuth.ApplicationTokenCredentials(
      faker.datatype.uuid(),
      faker.internet.url(),
      faker.internet.password()
    );
  });

  beforeEach(async () => {
    sqlPlugin = new SqlPlugin();
    pluginContext = await TestHelper.pluginContext(credentials);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("generate arm templates", async function () {
    const activeResourcePlugins = [ResourcePlugins.AzureSQL];
    pluginContext.projectSettings!.solutionSettings = {
      name: "test_solution",
      version: "1.0.0",
      activeResourcePlugins: activeResourcePlugins,
    } as AzureSolutionSettings;
    const result = await sqlPlugin.generateArmTemplates(pluginContext);

    // Assert
    const testModuleFileName = "sqlProvision.result.bicep";
    const mockedSolutionDataContext = {
      Plugins: activeResourcePlugins,
      PluginOutput: {
        "fx-resource-azure-sql": {
          Provision: {
            azureSql: {
              ProvisionPath: `./${testModuleFileName}`,
            },
          },
        },
      },
    };
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      const expectedResult = mockSolutionGenerateArmTemplates(
        mockedSolutionDataContext,
        result.value
      );

      const expectedBicepFileDirectory = path.join(__dirname, "expectedBicepFiles");
      const expectedModuleFilePath = path.join(expectedBicepFileDirectory, testModuleFileName);
      const moduleFile = await fs.readFile(expectedModuleFilePath, ConstantString.UTF8Encoding);

      chai.assert.strictEqual(expectedResult.Provision!.Modules!.azureSql, moduleFile);
      const expectedModuleSnippetFilePath = path.join(
        expectedBicepFileDirectory,
        "provision.result.bicep"
      );
      const OrchestrationConfigFile = await fs.readFile(
        expectedModuleSnippetFilePath,
        ConstantString.UTF8Encoding
      );
      chai.assert.strictEqual(expectedResult.Provision!.Orchestration, OrchestrationConfigFile);
      chai.assert.isNotNull(expectedResult.Provision!.Reference);
      chai.assert.strictEqual(
        JSON.stringify(expectedResult.Parameters, undefined, 2),
        fs.readFileSync(
          path.join(expectedBicepFileDirectory, "parameters.json"),
          ConstantString.UTF8Encoding
        )
      );
    }
  });

  it("Update arm templates", async function () {
    const activeResourcePlugins = [ResourcePlugins.AzureSQL];
    pluginContext.projectSettings!.solutionSettings = {
      name: "test_solution",
      version: "1.0.0",
      activeResourcePlugins: activeResourcePlugins,
    } as AzureSolutionSettings;
    const result = await sqlPlugin.generateArmTemplates(pluginContext);

    // Assert
    const testModuleFileName = "sqlProvision.result.bicep";
    const mockedSolutionDataContext = {
      Plugins: activeResourcePlugins,
      PluginOutput: {
        "fx-resource-azure-sql": {
          Provision: {
            azureSql: {
              ProvisionPath: `./${testModuleFileName}`,
            },
          },
        },
      },
    };
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      const expectedResult = mockSolutionUpdateArmTemplates(
        mockedSolutionDataContext,
        result.value
      );

      chai.assert.exists(expectedResult.Provision!.Reference!.sqlResourceId);
      chai.assert.exists(expectedResult.Provision!.Reference!.sqlEndpoint);
      chai.assert.exists(expectedResult.Provision!.Reference!.databaseName);
      chai.assert.notExists(expectedResult.Provision!.Orchestration);
      chai.assert.notExists(expectedResult.Provision!.Modules);
      chai.assert.notExists(expectedResult.Configuration!.Orchestration);
      chai.assert.isEmpty(expectedResult.Configuration!.Modules);
      chai.assert.notExists(expectedResult.Parameters);
    }
  });
});
