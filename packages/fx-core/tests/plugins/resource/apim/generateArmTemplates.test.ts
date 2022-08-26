// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import chai from "chai";
import { ResourceManagementClient } from "@azure/arm-resources";
import { Lazy } from "../../../../src/component/resource/apim/utils/commonUtils";
import { ApimManager } from "../../../../src/component/resource/apim/managers/apimManager";
import { OpenApiProcessor } from "../../../../src/component/resource/apim/utils/openApiProcessor";
import { ApimService } from "../../../../src/component/resource/apim/services/apimService";
import { ApiManagementClient } from "@azure/arm-apimanagement";
import path from "path";
import fs from "fs-extra";
import {
  mockSolutionGenerateArmTemplates,
  mockSolutionUpdateArmTemplates,
  ResourcePlugins,
} from "../util";
import { ConstantString } from "../../../../src/common/constants";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import { generateFakeServiceClientCredentials, MyTokenCredential } from "../bot/unit/utils";
import { ApimOutputBicepSnippet } from "../../../../src/component/resource/apim/constants";
import { ArmTemplateResult } from "../../../../src/common/armInterface";
import {
  AzureResourceApim,
  HostTypeOptionAzure,
  TabOptionItem,
} from "../../../../src/plugins/solution/fx-solution/question";
import { AzureSolutionSettings, PluginContext } from "@microsoft/teamsfx-api";
import { mockContext } from "./mock";

describe("apimManager.generateArmTemplates", () => {
  let apimManager: ApimManager;
  let pluginContext: any;

  before(async () => {
    apimManager = await mockApimManager();
    pluginContext = mockContext();
  });

  it("should successfully generate apim bicep files", async () => {
    // Arrange
    const activeResourcePlugins = [
      ResourcePlugins.Aad,
      ResourcePlugins.FrontendHosting,
      ResourcePlugins.Function,
      ResourcePlugins.SimpleAuth,
      ResourcePlugins.Apim,
    ];
    pluginContext.projectSettings!.solutionSettings = {
      hostType: HostTypeOptionAzure.id,
      name: "azure",
      activeResourcePlugins: activeResourcePlugins,
      capabilities: [TabOptionItem.id],
      azureResources: [AzureResourceApim.id],
    } as AzureSolutionSettings;
    // Act
    const result = await apimManager.generateArmTemplates(pluginContext);

    // Assert
    const testProvisionModuleFileName = "apimProvision.result.bicep";
    const testConfigurationModuleFileName = "apimConfiguration.result.bicep";
    const mockedSolutionDataContext = {
      Plugins: {
        "fx-resource-apim": {
          Provision: {
            apim: {
              path: `./${testProvisionModuleFileName}`,
            },
          },
          Configuration: {
            apim: {
              path: `./${testConfigurationModuleFileName}`,
            },
          },
          References: {
            serviceResourceId: ApimOutputBicepSnippet.ServiceResourceId,
          },
        },
        "fx-resource-function": {
          References: {
            functionAppResourceId: "provisionOutputs.functionOutput.value.functionAppResourceId",
            endpoint: "provisionOutputs.functionOutput.value.functionEndpoint",
          },
        },
        "fx-resource-frontend-hosting": {
          Outputs: {
            endpoint: "frontend_hosting_test_endpoint",
          },
          References: {
            domain: "provisionOutputs.frontendHostingOutput.value.domain",
            endpoint: "provisionOutputs.frontendHostingOutput.value.endpoint",
          },
        },
      },
    };

    const expectedResult = mockSolutionGenerateArmTemplates(mockedSolutionDataContext, result);

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

  it("should successfully update apim bicep files", async () => {
    // Arrange
    const activeResourcePlugins = [
      ResourcePlugins.Aad,
      ResourcePlugins.FrontendHosting,
      ResourcePlugins.Function,
      ResourcePlugins.SimpleAuth,
      ResourcePlugins.Apim,
    ];
    pluginContext.projectSettings!.solutionSettings = {
      hostType: HostTypeOptionAzure.id,
      name: "azure",
      activeResourcePlugins: activeResourcePlugins,
      capabilities: [TabOptionItem.id],
      azureResources: [AzureResourceApim.id],
    } as AzureSolutionSettings;
    // Act
    const result = await apimManager.updateArmTemplates(pluginContext);

    // Assert
    const testProvisionModuleFileName = "apimProvision.result.bicep";
    const testConfigurationModuleFileName = "apimConfiguration.result.bicep";
    const mockedSolutionDataContext = {
      Plugins: {
        "fx-resource-apim": {
          Configuration: {
            apim: {
              ConfigPath: `./${testConfigurationModuleFileName}`,
            },
          },
          References: {
            serviceResourceId: ApimOutputBicepSnippet.ServiceResourceId,
          },
        },
        "fx-resource-function": {
          References: {
            functionAppResourceId: "provisionOutputs.functionOutput.value.functionAppResourceId",
            endpoint: "provisionOutputs.functionOutput.value.functionEndpoint",
          },
        },
        "fx-resource-frontend-hosting": {
          Outputs: {
            endpoint: "frontend_hosting_test_endpoint",
          },
          References: {
            domain: "provisionOutputs.frontendHostingOutput.value.domain",
            endpoint: "provisionOutputs.frontendHostingOutput.value.endpoint",
          },
        },
      },
    };

    const expectedResult: ArmTemplateResult = mockSolutionUpdateArmTemplates(
      mockedSolutionDataContext,
      result
    );

    const expectedBicepFileDirectory = path.join(__dirname, "expectedBicepFiles");

    chai.assert.strictEqual(
      expectedResult.Configuration!.Modules!.apim,
      fs.readFileSync(
        path.join(expectedBicepFileDirectory, testConfigurationModuleFileName),
        ConstantString.UTF8Encoding
      )
    );

    chai.assert.notExists(expectedResult.Provision);
    chai.assert.notExists(expectedResult.Configuration!.Orchestration);
    chai.assert.notExists(expectedResult.Parameters);
    chai.assert.exists(expectedResult.Reference!.serviceResourceId);
    chai.assert.strictEqual(
      expectedResult.Reference!.serviceResourceId,
      "provisionOutputs.apimOutput.value.serviceResourceId"
    );
  });

  async function mockApimManager(): Promise<ApimManager> {
    const openApiProcessor = new OpenApiProcessor();
    const credential = new MyTokenCredential();
    const identityCredential = new MyTokenCredential();
    const subscriptionId = "test-subscription-id";
    const apimManagementClient = new ApiManagementClient(credential, subscriptionId);
    const resourceProviderClient = new ResourceManagementClient(identityCredential, subscriptionId)
      .providers;
    const lazyApimService = new Lazy<ApimService>(() =>
      Promise.resolve(
        new ApimService(apimManagementClient, resourceProviderClient, credential, subscriptionId)
      )
    );
    return new ApimManager(lazyApimService, openApiProcessor);
  }
});
