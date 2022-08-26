// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import dotenv from "dotenv";
import {
  ConfigMap,
  FxError,
  Inputs,
  Ok,
  Platform,
  PluginContext,
  Result,
} from "@microsoft/teamsfx-api";
import {
  QuestionConstants,
  TeamsToolkitComponent,
  OpenApiSchemaVersion,
} from "../../../../src/component/resource/apim/constants";
import { AadService } from "../../../../src/component/resource/apim/services/aadService";
import { AadManager } from "../../../../src/component/resource/apim/managers/aadManager";
import { createSandbox, SinonSandbox } from "sinon";
import { Factory } from "../../../../src/component/resource/apim/factory";
import {
  mockAxios,
  mockApimService,
  mockApiManagementService,
  DefaultTestInput,
  MockAxiosInput,
  mockApiVersionSet,
  mockApi,
  mockProductApi,
} from "./mock";
import { Lazy } from "../../../../src/component/resource/apim/utils/commonUtils";
import { ApimManager } from "../../../../src/component/resource/apim/managers/apimManager";
import { OpenApiProcessor } from "../../../../src/component/resource/apim/utils/openApiProcessor";
import { TeamsAppAadManager } from "../../../../src/component/resource/apim/managers/teamsAppAadManager";
import { ApimPlugin } from "../../../../src/plugins/resource/apim";
import { newEnvInfo } from "../../../../src/core/environment";

dotenv.config();
chai.use(chaiAsPromised);

describe("ApimPlugin", () => {
  describe("Happy path", () => {
    const sandbox = createSandbox();
    afterEach(() => {
      sandbox.restore();
    });
    const apimPlugin = new ApimPlugin();
    it("Create a new project", async () => {
      mockApimPlugin(sandbox);

      const ctx = await buildPluginContext(sandbox);
      let result = await apimPlugin.provision(ctx);
      chai.assert.isTrue(result.isOk(), "Operation apimPlugin.provision should be succeeded.");
      updateConfig(ctx, undefined, undefined, {
        serviceResourceId: `/subscriptions/${DefaultTestInput.subscriptionId}/resourceGroups/${DefaultTestInput.resourceGroup.existing}/providers/Microsoft.ApiManagement/service/apim111601dev624d09`,
        productResourceId: `/subscriptions/${DefaultTestInput.subscriptionId}/resourceGroups/${DefaultTestInput.resourceGroup.existing}/providers/Microsoft.ApiManagement/service/apim111601dev624d09/products/apim111601dev624d09`,
        authServerResourceId: `/subscriptions/${DefaultTestInput.subscriptionId}/resourceGroups/${DefaultTestInput.resourceGroup.existing}/providers/Microsoft.ApiManagement/service/apim111601dev624d09/authorizationServers/apim111601dev624d09`,
      });
      updateConfig(ctx, {
        objectId: DefaultTestInput.aadObjectId.created,
        clientId: DefaultTestInput.aadClientId.created,
        oauth2PermissionScopeId: "34221e41-10e8-4211-bf95-9084936ba1ad",
        applicationIdUris: `api://apim.xxx.web.core.windows.net/${DefaultTestInput.aadClientId.created}`,
      });
      result = await apimPlugin.postProvision(ctx);
      chai.assert.isTrue(result.isOk(), "Operation apimPlugin.postProvision should be succeeded.");
      updateConfig(
        ctx,
        undefined,
        { functionEndpoint: "https://apim-function-webapp.azurewebsites.net" },
        undefined,
        answer
      );
      result = await apimPlugin.deploy(ctx);
      chai.assert.isTrue(result.isOk(), "Operation apimPlugin.deploy should be succeeded.");
    });
  });
});

function mockApimPlugin(sandbox: SinonSandbox, mockApimInput?: MockAxiosInput) {
  const { axiosInstance, requestStub } = mockAxios(sandbox);
  const lazyAadService = new Lazy(
    async () => new AadService(axiosInstance, undefined, undefined, 2)
  );
  const aadManager = new AadManager(lazyAadService);
  const teamsAppAadManager = new TeamsAppAadManager(lazyAadService);
  sandbox.stub(Factory, "buildAadManager").resolves(aadManager);
  sandbox.stub(Factory, "buildTeamsAppAadManager").resolves(teamsAppAadManager);

  const { apimService, apiManagementClient, credential } = mockApimService(sandbox);
  const apiManagementServiceStub = mockApiManagementService(sandbox);
  apiManagementClient.apiManagementService = apiManagementServiceStub;
  const apiVersionSetStub = mockApiVersionSet(sandbox);
  apiManagementClient.apiVersionSet = apiVersionSetStub;
  const apiStub = mockApi(sandbox);
  apiManagementClient.api = apiStub;
  const productApiStub = mockProductApi(sandbox);
  apiManagementClient.productApi = productApiStub;

  const lazyApimService = new Lazy(async () => apimService);
  const openApiProcessor = new OpenApiProcessor();
  sandbox.stub(openApiProcessor, "loadOpenApiDocument").resolves({
    schemaVersion: OpenApiSchemaVersion.V3,
    spec: {
      openapi: "3.0.1",
      info: {
        title: "user input swagger",
        version: "v1",
      },
      paths: {},
    },
  });
  const apimManager = new ApimManager(lazyApimService, openApiProcessor);
  sandbox.stub(Factory, "buildApimManager").resolves(apimManager);
}

function buildPluginContext(
  sandbox: SinonSandbox,
  aadConfig?: any,
  functionConfig?: any,
  apimConfig?: any,
  answer?: Inputs
): PluginContext {
  const result: PluginContext = {
    root: "",
    envInfo: newEnvInfo(),
    config: new ConfigMap(),
    cryptoProvider: {
      encrypt: (plaintext: string): Result<string, FxError> => {
        return new Ok("");
      },
      decrypt: (ciphertext: string): Result<string, FxError> => {
        return new Ok("");
      },
    },
    projectSettings: {
      appName: "test-app-name",
      projectId: "test-project-id",
      solutionSettings: { name: "" },
    },
  };

  const solutionConfig = {
    resourceNameSuffix: "test-suffix",
    resourceGroupName: DefaultTestInput.resourceGroup.existing,
    teamsAppTenantId: "test-tenant-id",
    location: "test-location",
  };

  result.envInfo.state.set(TeamsToolkitComponent.Solution, new Map(Object.entries(solutionConfig)));
  result.envInfo.config.manifest.appName.short = "test-app-name";
  updateConfig(aadConfig, functionConfig, apimConfig, answer);
  return result;
}

function updateConfig(
  ctx: PluginContext,
  aadConfig?: any,
  functionConfig?: any,
  apimConfig?: any,
  answer?: Inputs
) {
  if (aadConfig) {
    ctx.envInfo.state.set(TeamsToolkitComponent.AadPlugin, new Map(Object.entries(aadConfig)));
  }

  if (functionConfig) {
    ctx.envInfo.state.set(
      TeamsToolkitComponent.FunctionPlugin,
      new Map(Object.entries(functionConfig))
    );
  }

  if (apimConfig) {
    for (const [key, value] of Object.entries(apimConfig)) {
      ctx.config.set(key, value);
    }
  }

  if (answer) {
    ctx.answers = answer;
  }
}

const answer: Inputs = {
  [QuestionConstants.VSCode.ApiVersion.questionName]: {
    id: QuestionConstants.VSCode.ApiVersion.createNewApiVersionOption,
    label: QuestionConstants.VSCode.ApiVersion.createNewApiVersionOption,
  },
  [QuestionConstants.VSCode.NewApiVersion.questionName]: "v1",
  [QuestionConstants.VSCode.OpenApiDocument.questionName]: {
    label: "openapi/openapi.json",
  },
  [QuestionConstants.VSCode.ApiPrefix.questionName]: "api-prefix",
  platform: Platform.VSCode,
};
