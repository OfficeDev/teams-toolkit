import "mocha";
import * as chai from "chai";
import { TestHelper } from "../helper";
import { IdentityPlugin } from "../../../../../src/plugins/resource/identity";
import * as dotenv from "dotenv";
import chaiAsPromised from "chai-as-promised";
import { AzureSolutionSettings, PluginContext } from "@microsoft/teamsfx-api";
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

describe("identityPlugin", () => {
  let identityPlugin: IdentityPlugin;
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
    identityPlugin = new IdentityPlugin();
    pluginContext = await TestHelper.pluginContext(credentials);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("generate arm templates", async function () {
    const activeResourcePlugins = [ResourcePlugins.Identity];
    pluginContext.projectSettings!.solutionSettings = {
      name: "test_solution",
      version: "1.0.0",
      activeResourcePlugins: activeResourcePlugins,
    } as AzureSolutionSettings;
    const result = await identityPlugin.generateArmTemplates(pluginContext);

    // Assert
    const testModuleFileName = "identityProvision.result.bicep";
    const mockedSolutionDataContext = {
      Plugins: activeResourcePlugins,
      PluginOutput: {
        "fx-resource-identity": {
          Provision: {
            identity: {
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
      chai.assert.strictEqual(expectedResult.Provision!.Modules!.identity, moduleFile);
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
      chai.assert.isUndefined(expectedResult.Parameters);
    }
  });

  it("Update arm templates", async function () {
    const activeResourcePlugins = [ResourcePlugins.Identity];
    pluginContext.projectSettings!.solutionSettings = {
      name: "test_solution",
      version: "1.0.0",
      activeResourcePlugins: activeResourcePlugins,
    } as AzureSolutionSettings;
    const result = await identityPlugin.generateArmTemplates(pluginContext);

    // Assert
    const testModuleFileName = "identityProvision.result.bicep";
    const mockedSolutionDataContext = {
      Plugins: activeResourcePlugins,
      PluginOutput: {
        "fx-resource-identity": {
          Provision: {
            identity: {
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
      chai.assert.notExists(expectedResult.Provision!.Modules);
      chai.assert.notExists(expectedResult.Provision!.Orchestration);
      chai.assert.exists(expectedResult.Provision!.Reference!.identityName);
      chai.assert.exists(expectedResult.Provision!.Reference!.identityClientId);
      chai.assert.exists(expectedResult.Provision!.Reference!.identityResourceId);
      chai.assert.exists(expectedResult.Provision!.Reference!.identityPrincipalId);
      chai.assert.notExists(expectedResult.Configuration!.Orchestration);
      chai.assert.isEmpty(expectedResult.Configuration!.Modules);
      chai.assert.notExists(expectedResult.Parameters);
    }
  });
});
