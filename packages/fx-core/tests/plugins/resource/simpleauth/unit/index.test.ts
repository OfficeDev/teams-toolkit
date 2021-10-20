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
import { PluginContext } from "@microsoft/teamsfx-api";
import * as uuid from "uuid";
import { ConstantString, mockSolutionUpdateArmTemplates } from "../../util";
import { TeamsClientId } from "../../../../../src/common/constants";
import { isMultiEnvEnabled } from "../../../../../src";
import { LocalSettingsAuthKeys } from "../../../../../src/common/localSettingsConstants";

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
        LocalSettingsAuthKeys.SimpleAuthFilePath
      ) as string;
    } else {
      filePath = pluginContext.config.get(Constants.SimpleAuthPlugin.configKeys.filePath) as string;
    }
    chai.assert.isOk(filePath);
    chai.assert.isTrue(await fs.pathExists(filePath));
    const expectedEnvironmentVariableParams = `CLIENT_ID="mock-local-clientId" CLIENT_SECRET="mock-local-clientSecret" OAUTH_AUTHORITY="https://login.microsoftonline.com/mock-teamsAppTenantId" IDENTIFIER_URI="mock-local-applicationIdUris" ALLOWED_APP_IDS="${TeamsClientId.MobileDesktop};${TeamsClientId.Web}" TAB_APP_ENDPOINT="https://endpoint.mock" AAD_METADATA_ADDRESS="https://login.microsoftonline.com/mock-teamsAppTenantId/v2.0/.well-known/openid-configuration"`;
    if (isMultiEnvEnabled()) {
      chai.assert.strictEqual(
        pluginContext.localSettings?.auth?.get(
          LocalSettingsAuthKeys.SimpleAuthEnvironmentVariableParams
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
    // Act
    const activeResourcePlugins = [Constants.AadAppPlugin.id, Constants.SimpleAuthPlugin.id];
    pluginContext.projectSettings = {
      appName: "test_generate_arm_template_with_only_simple_auth_plugin_app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "test_solution",
        version: "1.0.0",
        activeResourcePlugins: activeResourcePlugins,
      },
    };
    const generateArmTemplatesResult = await simpleAuthPlugin.generateArmTemplates(pluginContext);

    // Assert
    const testProvisionModuleFileName = "simple_auth_provision.only.bicep";
    const testConfigurationModuleFileName = "simple_auth_configuration.only.bicep";
    const mockedSolutionDataContext = {
      Plugins: activeResourcePlugins,
      PluginOutput: {
        "fx-resource-simple-auth": {
          Modules: {
            simpleAuthProvision: {
              Path: `./${testProvisionModuleFileName}`,
            },
            simpleAuthConfiguration: {
              Path: `./${testConfigurationModuleFileName}`,
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
      const expectedProvisionModuleFilePath = path.join(
        expectedBicepFileDirectory,
        testProvisionModuleFileName
      );
      chai.assert.strictEqual(
        expectedResult.Modules!.simpleAuthProvision.Content,
        fs.readFileSync(expectedProvisionModuleFilePath, ConstantString.UTF8Encoding)
      );
      const expectedConfigurationModuleFilePath = path.join(
        expectedBicepFileDirectory,
        testConfigurationModuleFileName
      );
      chai.assert.strictEqual(
        expectedResult.Modules!.simpleAuthConfiguration.Content,
        fs.readFileSync(expectedConfigurationModuleFilePath, ConstantString.UTF8Encoding)
      );
      const expectedModuleSnippetFilePath = path.join(
        expectedBicepFileDirectory,
        "module.only.bicep"
      );
      chai.assert.strictEqual(
        expectedResult.Orchestration.ModuleTemplate!.Content,
        fs.readFileSync(expectedModuleSnippetFilePath, ConstantString.UTF8Encoding)
      );
      const expectedParameterFilePath = path.join(expectedBicepFileDirectory, "param.bicep");
      chai.assert.strictEqual(
        expectedResult.Orchestration.ParameterTemplate!.Content,
        fs.readFileSync(expectedParameterFilePath, ConstantString.UTF8Encoding)
      );
      const expectedOutputFilePath = path.join(expectedBicepFileDirectory, "output.bicep");
      chai.assert.strictEqual(
        expectedResult.Orchestration.OutputTemplate!.Content,
        fs.readFileSync(expectedOutputFilePath, ConstantString.UTF8Encoding)
      );
      chai.assert.isUndefined(expectedResult.Orchestration.VariableTemplate);
      chai.assert.isUndefined(expectedResult.Orchestration.ParameterTemplate!.ParameterJson);
    }
  });

  it("generate arm templates: simple auth plugin with all resource plugins enabled", async function () {
    // Act
    const activeResourcePlugins = [
      Constants.AadAppPlugin.id,
      Constants.SimpleAuthPlugin.id,
      Constants.FrontendPlugin.id,
    ];
    pluginContext.projectSettings = {
      appName: "test_generate_arm_template_with_all_plugins_app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "test_solution",
        version: "1.0.0",
        activeResourcePlugins: activeResourcePlugins,
      },
    };
    const generateArmTemplatesResult = await simpleAuthPlugin.generateArmTemplates(pluginContext);

    // Assert
    const testProvisionModuleFileName = "simple_auth_provision.all.bicep";
    const testConfigurationModuleFileName = "simple_auth_configuration.all.bicep";
    const mockedSolutionDataContext = {
      Plugins: activeResourcePlugins,
      PluginOutput: {
        "fx-resource-simple-auth": {
          Modules: {
            simpleAuthProvision: {
              Path: `./${testProvisionModuleFileName}`,
            },
            simpleAuthConfiguration: {
              Path: `./${testConfigurationModuleFileName}`,
            },
          },
        },
        "fx-resource-frontend-hosting": {
          Outputs: {
            endpoint: "frontend_hosting_test_endpoint",
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
      const expectedProvisionModuleFilePath = path.join(
        expectedBicepFileDirectory,
        testProvisionModuleFileName
      );
      chai.assert.strictEqual(
        expectedResult.Modules!.simpleAuthProvision.Content,
        fs.readFileSync(expectedProvisionModuleFilePath, ConstantString.UTF8Encoding)
      );
      const expectedConfigurationModuleFilePath = path.join(
        expectedBicepFileDirectory,
        testConfigurationModuleFileName
      );
      chai.assert.strictEqual(
        expectedResult.Modules!.simpleAuthConfiguration.Content,
        fs.readFileSync(expectedConfigurationModuleFilePath, ConstantString.UTF8Encoding)
      );
      const expectedModuleSnippetFilePath = path.join(
        expectedBicepFileDirectory,
        "module.all.bicep"
      );
      chai.assert.strictEqual(
        expectedResult.Orchestration.ModuleTemplate!.Content,
        fs.readFileSync(expectedModuleSnippetFilePath, ConstantString.UTF8Encoding)
      );
      const expectedParameterFilePath = path.join(expectedBicepFileDirectory, "param.bicep");
      chai.assert.strictEqual(
        expectedResult.Orchestration.ParameterTemplate!.Content,
        fs.readFileSync(expectedParameterFilePath, ConstantString.UTF8Encoding)
      );
      const expectedOutputFilePath = path.join(expectedBicepFileDirectory, "output.bicep");
      chai.assert.strictEqual(
        expectedResult.Orchestration.OutputTemplate!.Content,
        fs.readFileSync(expectedOutputFilePath, ConstantString.UTF8Encoding)
      );
      chai.assert.isUndefined(expectedResult.Orchestration.VariableTemplate);
      chai.assert.isUndefined(expectedResult.Orchestration.ParameterTemplate!.ParameterJson);
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
