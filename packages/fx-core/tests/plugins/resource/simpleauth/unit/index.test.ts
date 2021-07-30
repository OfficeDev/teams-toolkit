// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as sinon from "sinon";
import * as path from "path";

import { SimpleAuthPlugin } from "../../../../../src/plugins/resource/simpleauth/index";
import { TestHelper } from "../helper";
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
    const filePath = pluginContext.config.get(
      Constants.SimpleAuthPlugin.configKeys.filePath
    ) as string;
    chai.assert.isOk(filePath);
    chai.assert.isTrue(await fs.pathExists(filePath));
    const expectedEnvironmentVariableParams =
      'CLIENT_ID="mock-local-clientId" CLIENT_SECRET="mock-local-clientSecret" OAUTH_AUTHORITY="https://login.microsoftonline.com/mock-teamsAppTenantId" IDENTIFIER_URI="mock-local-applicationIdUris" ALLOWED_APP_IDS="mock-teamsMobileDesktopAppId;mock-teamsWebAppId" TAB_APP_ENDPOINT="https://endpoint.mock" AAD_METADATA_ADDRESS="https://login.microsoftonline.com/mock-teamsAppTenantId/v2.0/.well-known/openid-configuration"';
    chai.assert.strictEqual(
      pluginContext.config.get(Constants.SimpleAuthPlugin.configKeys.environmentVariableParams),
      expectedEnvironmentVariableParams
    );
  });

  it("generate arm templates with only simple auth plugin", async function () {
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
    const testModuleFileName = "simple_auth_test.bicep";
    const mockedSolutionDataContext = {
      Plugins: activeResourcePlugins,
      PluginOutput: {
        "fx-resource-simple-auth": {
          Modules: {
            simpleAuthProvision: {
              Path: `./${testModuleFileName}`,
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

      const expectedBicepFileDirectory = path.join(
        __dirname,
        "expectedBicepFiles",
        "onlyWithSimpleAuthPlugin"
      );
      const expectedModuleFilePath = path.join(expectedBicepFileDirectory, testModuleFileName);
      chai.assert.strictEqual(
        expectedResult.Modules!.simpleAuthProvision.Content,
        fs.readFileSync(expectedModuleFilePath, ConstantString.UTF8Encoding)
      );
      const expectedModuleSnippetFilePath = path.join(expectedBicepFileDirectory, "module.bicep");
      chai.assert.strictEqual(
        expectedResult.Orchestration.ModuleTemplate!.Content,
        fs.readFileSync(expectedModuleSnippetFilePath, ConstantString.UTF8Encoding)
      );
      const expectedParameterFilePath = path.join(expectedBicepFileDirectory, "input_param.bicep");
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

  it("generate arm templates with all plugins", async function () {
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
    const testModuleFileName = "simple_auth_test.bicep";
    const mockedSolutionDataContext = {
      Plugins: activeResourcePlugins,
      PluginOutput: {
        "fx-resource-simple-auth": {
          Modules: {
            simpleAuthProvision: {
              Path: `./${testModuleFileName}`,
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

      const expectedBicepFileDirectory = path.join(
        __dirname,
        "expectedBicepFiles",
        "withAllPlugins"
      );
      const expectedModuleFilePath = path.join(expectedBicepFileDirectory, testModuleFileName);
      chai.assert.strictEqual(
        expectedResult.Modules!.simpleAuthProvision.Content,
        fs.readFileSync(expectedModuleFilePath, ConstantString.UTF8Encoding)
      );
      const expectedModuleSnippetFilePath = path.join(expectedBicepFileDirectory, "module.bicep");
      chai.assert.strictEqual(
        expectedResult.Orchestration.ModuleTemplate!.Content,
        fs.readFileSync(expectedModuleSnippetFilePath, ConstantString.UTF8Encoding)
      );
      const expectedParameterFilePath = path.join(expectedBicepFileDirectory, "input_param.bicep");
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
    const webApp = {
      endpoint: faker.internet.url(),
      skuName: "B1",
    };
    sinon.stub(WebAppClient.prototype, "createWebApp").resolves(webApp);
    sinon.stub(WebAppClient.prototype, "zipDeploy").resolves();
    sinon.stub(WebAppClient.prototype, "configWebApp").resolves();

    // Act
    const provisionResult = await simpleAuthPlugin.provision(pluginContext);
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
      const resourceNameSuffix = pluginContext.configOfOtherPlugins
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
