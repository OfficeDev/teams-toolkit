// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as sinon from "sinon";
import * as path from "path";

import { SimpleAuthPlugin } from "../../../../../src/plugins/resource/simpleauth/index";
import { mockArmOutput, TestHelper } from "../helper";
import { Constants } from "../../../../../src/plugins/resource/simpleauth/constants";
import * as msRestNodeAuth from "@azure/ms-rest-nodeauth";
import * as fs from "fs-extra";
import { WebAppClient } from "../../../../../src/plugins/resource/simpleauth/webAppClient";
import * as faker from "faker";
import * as dotenv from "dotenv";
import { Utils } from "../../../../../src/plugins/resource/simpleauth/utils/common";
import { AzureSolutionSettings, PluginContext } from "@microsoft/teamsfx-api";
import * as uuid from "uuid";
import {
  ConstantString,
  mockSolutionGenerateArmTemplates,
  mockSolutionUpdateArmTemplates,
} from "../../util";
import { isMultiEnvEnabled } from "../../../../../src";
import { LocalSettingsSimpleAuthKeys } from "../../../../../src/common/localSettingsConstants";
import { getAllowedAppIds } from "../../../../../src/common/tools";
import {
  AzureResourceKeyVault,
  HostTypeOptionAzure,
} from "../../../../../src/plugins/solution/fx-solution/question";
import { ResourcePlugins } from "../../util";
chai.use(chaiAsPromised);

dotenv.config();
const testWithAzure: boolean = process.env.UT_TEST_ON_AZURE ? true : false;

describe("simpleAuthPlugin", () => {
  let simpleAuthPlugin: SimpleAuthPlugin;
  let pluginContext: PluginContext;
  let credentials: msRestNodeAuth.TokenCredentialsBase;

  before(async () => {
    if (testWithAzure) {
      credentials = await msRestNodeAuth.interactiveLogin();
    } else {
      credentials = new msRestNodeAuth.ApplicationTokenCredentials(
        faker.datatype.uuid(),
        faker.internet.url(),
        faker.internet.password()
      );
    }
  });

  beforeEach(async () => {
    simpleAuthPlugin = new SimpleAuthPlugin();
    pluginContext = await TestHelper.pluginContext(credentials);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("local debug", async function () {
    // Act
    await simpleAuthPlugin.localDebug(pluginContext);
    await simpleAuthPlugin.postLocalDebug(pluginContext);

    // Assert
    let filePath: string;
    if (isMultiEnvEnabled()) {
      filePath = pluginContext.localSettings?.auth?.get(
        LocalSettingsSimpleAuthKeys.SimpleAuthFilePath
      ) as string;
    } else {
      filePath = pluginContext.config.get(Constants.SimpleAuthPlugin.configKeys.filePath) as string;
    }
    chai.assert.isOk(filePath);
    chai.assert.isTrue(await fs.pathExists(filePath));
    const expectedEnvironmentVariableParams = `CLIENT_ID="mock-local-clientId" CLIENT_SECRET="mock-local-clientSecret" OAUTH_AUTHORITY="https://login.microsoftonline.com/mock-teamsAppTenantId" IDENTIFIER_URI="mock-local-applicationIdUris" ALLOWED_APP_IDS="${getAllowedAppIds().join(
      ";"
    )}" TAB_APP_ENDPOINT="https://endpoint.mock" AAD_METADATA_ADDRESS="https://login.microsoftonline.com/mock-teamsAppTenantId/v2.0/.well-known/openid-configuration"`;
    if (isMultiEnvEnabled()) {
      chai.assert.strictEqual(
        pluginContext.localSettings?.auth?.get(
          LocalSettingsSimpleAuthKeys.SimpleAuthEnvironmentVariableParams
        ),
        expectedEnvironmentVariableParams
      );
    } else {
      chai.assert.strictEqual(
        pluginContext.config.get(Constants.SimpleAuthPlugin.configKeys.environmentVariableParams),
        expectedEnvironmentVariableParams
      );
    }
  });

  it("generate arm templates: only simple auth plugin", async function () {
    const activeResourcePlugins = [ResourcePlugins.Aad, ResourcePlugins.SimpleAuth];
    const settings: AzureSolutionSettings = {
      hostType: HostTypeOptionAzure.id,
      name: "azure",
      activeResourcePlugins: activeResourcePlugins,
    } as AzureSolutionSettings;
    await testGenerateArmTemplates(
      settings,
      "simpleAuthConfig.result.bicep",
      "config.result.bicep"
    );
  });

  it("generate arm templates: simple auth plugin + key vault plugin", async function () {
    const activeResourcePlugins = [
      ResourcePlugins.Aad,
      ResourcePlugins.SimpleAuth,
      ResourcePlugins.KeyVault,
    ];
    const settings: AzureSolutionSettings = {
      hostType: HostTypeOptionAzure.id,
      name: "azure",
      activeResourcePlugins: activeResourcePlugins,
      azureResources: [AzureResourceKeyVault.id],
    } as AzureSolutionSettings;
    await testGenerateArmTemplates(
      settings,
      "simpleAuthConfigWithKeyVaultPlugin.result.bicep",
      "configWithKeyVaultPlugin.result.bicep",
      {
        "fx-resource-key-vault": {
          References: {
            m365ClientSecretReference:
              "provisionOutputs.keyVaultOutput.value.m365ClientSecretReference",
          },
        },
      }
    );
  });

  async function testGenerateArmTemplates(
    settings: AzureSolutionSettings,
    testConfigurationModuleFileName: string,
    testConfigurationFileName: string,
    addtionalPluginOutput: any = {}
  ): Promise<void> {
    // Act
    pluginContext.projectSettings = {
      appName: "test_generate_arm_template_with_only_simple_auth_plugin_app",
      projectId: uuid.v4(),
      solutionSettings: settings,
    };
    const generateArmTemplatesResult = await simpleAuthPlugin.generateArmTemplates(pluginContext);

    // Assert
    const testProvisionModuleFileName = "simpleAuthProvision.result.bicep";
    const simpleAuthOutput = {
      "fx-resource-simple-auth": {
        Provision: {
          simpleAuth: {
            path: `./${testProvisionModuleFileName}`,
          },
        },
        Configuration: {
          simpleAuth: {
            path: `./${testConfigurationModuleFileName}`,
          },
        },
      },
    };
    const mockedSolutionDataContext = {
      Plugins: { ...simpleAuthOutput, ...addtionalPluginOutput },
    };

    chai.assert.isTrue(generateArmTemplatesResult.isOk());
    if (generateArmTemplatesResult.isOk()) {
      const expectedResult = mockSolutionGenerateArmTemplates(
        mockedSolutionDataContext,
        generateArmTemplatesResult.value
      );

      const expectedBicepFileDirectory = path.join(__dirname, "expectedBicepFiles");
      const expectedProvisionModuleFilePath = path.join(
        expectedBicepFileDirectory,
        testProvisionModuleFileName
      );
      const provisionMpduleFile = await fs.readFile(
        expectedProvisionModuleFilePath,
        ConstantString.UTF8Encoding
      );
      chai.assert.strictEqual(expectedResult.Provision!.Modules!.simpleAuth, provisionMpduleFile);
      const expectedConfigurationModuleFilePath = path.join(
        expectedBicepFileDirectory,
        testConfigurationModuleFileName
      );

      const configModuleFile = await fs.readFile(
        expectedConfigurationModuleFilePath,
        ConstantString.UTF8Encoding
      );
      chai.assert.strictEqual(expectedResult.Configuration!.Modules!.simpleAuth, configModuleFile);
      const expectedPrvosionSnippetFilePath = path.join(
        expectedBicepFileDirectory,
        "provision.result.bicep"
      );

      const orchestrationProvisionFile = await fs.readFile(
        expectedPrvosionSnippetFilePath,
        ConstantString.UTF8Encoding
      );
      chai.assert.strictEqual(expectedResult.Provision!.Orchestration, orchestrationProvisionFile);
      const expectedConfigFilePath = path.join(
        expectedBicepFileDirectory,
        testConfigurationFileName
      );

      const OrchestrationConfigFile = await fs.readFile(
        expectedConfigFilePath,
        ConstantString.UTF8Encoding
      );
      chai.assert.strictEqual(expectedResult.Configuration!.Orchestration, OrchestrationConfigFile);
      chai.assert.isUndefined(expectedResult.Parameters);
      chai.assert.isNotNull(expectedResult.Reference);
    }
  }

  it("update arm templates: only simple auth plugin", async function () {
    // Act
    const activeResourcePlugins = [ResourcePlugins.Aad, ResourcePlugins.SimpleAuth];
    pluginContext.projectSettings = {
      appName: "test_generate_arm_template_with_only_simple_auth_plugin_app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        activeResourcePlugins: activeResourcePlugins,
      },
    };
    const generateArmTemplatesResult = await simpleAuthPlugin.updateArmTemplates(pluginContext);

    // Assert
    const testProvisionModuleFileName = "simpleAuthProvision.result.bicep";
    const testConfigurationModuleFileName = "simpleAuthConfig.result.bicep";
    const mockedSolutionDataContext = {
      Plugins: {
        "fx-resource-simple-auth": {
          Provision: {
            simpleAuth: {
              path: `./${testProvisionModuleFileName}`,
            },
          },
          Configuration: {
            simpleAuth: {
              path: `./${testConfigurationModuleFileName}`,
            },
          },
        },
      },
    };

    chai.assert.isTrue(generateArmTemplatesResult.isOk());
    if (generateArmTemplatesResult.isOk()) {
      const expectedResult = mockSolutionUpdateArmTemplates(
        mockedSolutionDataContext,
        generateArmTemplatesResult.value
      );
      const expectedBicepFileDirectory = path.join(__dirname, "expectedBicepFiles");
      const expectedConfigurationModuleFilePath = path.join(
        expectedBicepFileDirectory,
        testConfigurationModuleFileName
      );
      const configModuleFile = await fs.readFile(
        expectedConfigurationModuleFilePath,
        ConstantString.UTF8Encoding
      );
      chai.assert.strictEqual(expectedResult.Configuration!.Modules!.simpleAuth, configModuleFile);
      chai.assert.notExists(expectedResult.Provision);
      chai.assert.notExists(expectedResult.Configuration!.Orchestration);
      chai.assert.notExists(expectedResult.Parameters);
      chai.assert.exists(expectedResult.Reference!.skuName);
      chai.assert.exists(expectedResult.Reference!.endpoint);
    }
  });

  it("provision", async function () {
    // Arrange
    const webAppUrl = faker.internet.url();
    const webApp = {
      endpoint: webAppUrl,
      skuName: "B1",
    };
    sinon.stub(WebAppClient.prototype, "createWebApp").resolves(webApp);
    sinon.stub(WebAppClient.prototype, "zipDeploy").resolves();
    sinon.stub(WebAppClient.prototype, "configWebApp").resolves();

    // Act
    const provisionResult = await simpleAuthPlugin.provision(pluginContext);
    mockArmOutput(pluginContext, webAppUrl);
    const postProvisionResult = await simpleAuthPlugin.postProvision(pluginContext);

    // Assert
    chai.assert.isTrue(provisionResult.isOk());
    chai.assert.strictEqual(
      pluginContext.config.get(Constants.SimpleAuthPlugin.configKeys.endpoint),
      webApp.endpoint
    );
    chai.assert.isTrue(postProvisionResult.isOk());
  });

  it("provision with Azure", async function () {
    if (testWithAzure) {
      // Act
      const provisionResult = await simpleAuthPlugin.provision(pluginContext);
      const postProvisionResult = await simpleAuthPlugin.postProvision(pluginContext);

      // Assert
      chai.assert.isTrue(provisionResult.isOk());
      const resourceNameSuffix = pluginContext.envInfo.state
        .get(Constants.SolutionPlugin.id)
        ?.get(Constants.SolutionPlugin.configKeys.resourceNameSuffix) as string;
      const webAppName = Utils.generateResourceName(
        pluginContext.projectSettings!.appName,
        resourceNameSuffix
      );
      chai.assert.strictEqual(
        pluginContext.config.get(Constants.SimpleAuthPlugin.configKeys.endpoint),
        `https://${webAppName}.azurewebsites.net`
      );
      chai.assert.isTrue(postProvisionResult.isOk());
    } else {
      this.skip();
    }
  });
});
