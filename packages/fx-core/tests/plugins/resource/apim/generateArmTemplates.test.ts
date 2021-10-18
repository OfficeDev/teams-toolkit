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
import { mockSolutionUpdateArmTemplates } from "../util";
import { ConstantString } from "../../../../src/common/constants";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import { generateFakeServiceClientCredentials } from "../bot/unit/utils";

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
    const mockedAzureSolutionConfig: AzureSolutionSettings = {
      name: "mocked-azure-solution-config",
      hostType: "",
      capabilities: [],
      azureResources: [],
      activeResourcePlugins: activeResourcePlugins,
    };

    // Act
    const result = await apimManager.generateArmTemplates(mockedAzureSolutionConfig);

    // Assert
    const provisionModuleFileName = "apimProvision.bicep";
    const mockedSolutionDataContext = {
      Plugins: activeResourcePlugins,
      PluginOutput: {
        "fx-resource-apim": {
          Modules: {
            apimProvision: {
              Path: `./${provisionModuleFileName}`,
            },
          },
        },
      },
    };
    const compiledResult = mockSolutionUpdateArmTemplates(mockedSolutionDataContext, result);
    const expectedBicepFileDirectory = path.join(__dirname, "expectedBicepFiles");
    chai.assert.strictEqual(
      compiledResult.Modules!.apimProvision.Content,
      fs.readFileSync(path.join(expectedBicepFileDirectory, provisionModuleFileName), {
        encoding: ConstantString.UTF8Encoding,
      })
    );
    chai.assert.strictEqual(
      compiledResult.Orchestration.ModuleTemplate!.Content,
      fs.readFileSync(
        path.join(expectedBicepFileDirectory, "module.bicep"),
        ConstantString.UTF8Encoding
      )
    );
    chai.assert.strictEqual(
      compiledResult.Orchestration.ParameterTemplate!.Content,
      fs.readFileSync(
        path.join(expectedBicepFileDirectory, "param.bicep"),
        ConstantString.UTF8Encoding
      )
    );
    chai.assert.strictEqual(
      compiledResult.Orchestration.OutputTemplate!.Content,
      fs.readFileSync(
        path.join(expectedBicepFileDirectory, "output.bicep"),
        ConstantString.UTF8Encoding
      )
    );
    chai.assert.strictEqual(
      JSON.stringify(compiledResult.Orchestration.ParameterTemplate!.ParameterJson, undefined, 2),
      fs.readFileSync(
        path.join(expectedBicepFileDirectory, "parameters.json"),
        ConstantString.UTF8Encoding
      )
    );
    chai.assert.isUndefined(compiledResult.Orchestration.VariableTemplate);
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
