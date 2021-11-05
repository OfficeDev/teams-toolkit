// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import chai from "chai";
import { Providers, ResourceManagementClientContext } from "@azure/arm-resources";
import { Lazy } from "../../../../src/plugins/resource/apim/utils/commonUtils";
import { AzureSolutionSettings } from "@microsoft/teamsfx-api";
import { ApimManager } from "../../../../src/plugins/resource/apim/managers/apimManager";
import { OpenApiProcessor } from "../../../../src/plugins/resource/apim/utils/openApiProcessor";
import { ApimService } from "../../../../src/plugins/resource/apim/services/apimService";
import { ApiManagementClient } from "@azure/arm-apimanagement";
import { ResourcePlugins } from "../../../../src/plugins/solution/fx-solution/ResourcePluginContainer";
import path from "path";
import fs from "fs-extra";
import { mockSolutionUpdateArmTemplates, mockSolutionUpdateArmTemplatesV2 } from "../util";
import { ConstantString } from "../../../../src/common/constants";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import { generateFakeServiceClientCredentials } from "../bot/unit/utils";
import { ApimOutputBicepSnippet } from "../../../../src/plugins/resource/apim/constants";

describe("apimManager.generateArmTemplates", () => {
  let apimManager: ApimManager;

  before(async () => {
    apimManager = await mockApimManager();
  });

  it("should successfully generate apim bicep files", async () => {
    // Arrange
    const activeResourcePlugins = [
      ResourcePlugins.AadPlugin,
      ResourcePlugins.AppStudioPlugin,
      ResourcePlugins.FrontendPlugin,
      ResourcePlugins.FunctionPlugin,
      ResourcePlugins.SimpleAuthPlugin,
      ResourcePlugins.ApimPlugin,
    ];

    // Act
    const result = await apimManager.generateArmTemplates();

    // Assert
    const testProvisionModuleFileName = "apimProvision.result.bicep";
    const testConfigurationModuleFileName = "apimConfiguration.result.bicep";
    const mockedSolutionDataContext = {
      Plugins: activeResourcePlugins,
      PluginOutput: {
        "fx-resource-apim": {
          Provision: {
            apim: {
              ProvisionPath: `./${testProvisionModuleFileName}`,
            },
          },
          Configuration: {
            apim: {
              ConfigPath: `./${testConfigurationModuleFileName}`,
            },
          },
          References: {
            serviceResourceId: ApimOutputBicepSnippet.ServiceResourceId,
          },
        },
      },
    };

    const expectedResult = mockSolutionUpdateArmTemplatesV2(mockedSolutionDataContext, result);

    const expectedBicepFileDirectory = path.join(__dirname, "expectedBicepFiles");

    chai.assert.strictEqual(
      expectedResult.Provision!.Modules!.apim,
      fs.readFileSync(path.join(expectedBicepFileDirectory, testProvisionModuleFileName), {
        encoding: ConstantString.UTF8Encoding,
      })
    );
    chai.assert.strictEqual(
      expectedResult.Provision!.Orchestration,
      fs.readFileSync(path.join(expectedBicepFileDirectory, "provision.result.bicep"), {
        encoding: ConstantString.UTF8Encoding,
      })
    );
    chai.assert.strictEqual(
      expectedResult.Configuration!.Modules!.apim,
      fs.readFileSync(
        path.join(expectedBicepFileDirectory, testConfigurationModuleFileName),
        ConstantString.UTF8Encoding
      )
    );
    chai.assert.strictEqual(
      expectedResult.Configuration!.Orchestration,
      fs.readFileSync(
        path.join(expectedBicepFileDirectory, "config.result.bicep"),
        ConstantString.UTF8Encoding
      )
    );
    chai.assert.strictEqual(
      JSON.stringify(expectedResult.Parameters, undefined, 2),
      fs.readFileSync(
        path.join(expectedBicepFileDirectory, "parameters.json"),
        ConstantString.UTF8Encoding
      )
    );
  });

  async function mockApimManager(): Promise<ApimManager> {
    const openApiProcessor = new OpenApiProcessor();
    const credential = generateFakeServiceClientCredentials();
    const subscriptionId = "test-subscription-id";
    const apimManagementClient = new ApiManagementClient(credential, subscriptionId);
    const resourceProviderClient = new Providers(
      new ResourceManagementClientContext(credential, subscriptionId)
    );
    const lazyApimService = new Lazy<ApimService>(() =>
      Promise.resolve(
        new ApimService(
          apimManagementClient,
          resourceProviderClient,
          credential as TokenCredentialsBase,
          subscriptionId
        )
      )
    );
    return new ApimManager(lazyApimService, openApiProcessor);
  }
});
