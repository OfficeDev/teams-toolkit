// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import dotenv from "dotenv";
import { ApimPlugin } from "../../../../src/plugins/resource/apim/index";
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
} from "../../../../src/plugins/resource/apim/constants";
import { AadService } from "../../../../src/plugins/resource/apim/services/aadService";
import { AadManager } from "../../../../src/plugins/resource/apim/managers/aadManager";
import {
  IAadPluginConfig,
  IFunctionPluginConfig,
} from "../../../../src/plugins/resource/apim/config";
import { isArmSupportEnabled, newEnvInfo } from "../../../../src";
import { createSandbox, SinonSandbox } from "sinon";
import { Factory } from "../../../../src/plugins/resource/apim/factory";
import {
  mockAxios,
  mockApimService,
  mockApiManagementService,
  DefaultTestInput,
  mockCredential,
  MockApiManagementServiceInput,
  MockAxiosInput,
} from "./mock";
import { Lazy } from "../../../../src/plugins/resource/apim/utils/commonUtils";
import { ApimManager } from "../../../../src/plugins/resource/apim/managers/apimManager";
import { OpenApiProcessor } from "../../../../src/plugins/resource/apim/utils/openApiProcessor";
import { TeamsAppAadManager } from "../../../../src/plugins/resource/apim/managers/teamsAppAadManager";

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
      if (!isArmSupportEnabled()) {
        return;
      }

      mockApimPlugin(sandbox);

      const ctx = await buildPluginContext(sandbox);
      let result = await apimPlugin.provision(ctx);
      chai.assert.isTrue(result.isOk(), "Operation apimPlugin.provision should be succeeded.");
      updateConfig(ctx, {
        objectId: DefaultTestInput.aadObjectId.created,
        clientId: DefaultTestInput.aadClientId.created,
        oauth2PermissionScopeId: "34221e41-10e8-4211-bf95-9084936ba1ad",
        applicationIdUris: `api://apim.xxx.web.core.windows.net/${DefaultTestInput.aadClientId.created}`,
      });
      result = await apimPlugin.postProvision(ctx);
      console.log(JSON.stringify(result));
      chai.assert.isTrue(result.isOk(), "Operation apimPlugin.postProvision should be succeeded.");
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
  mockCredential(sandbox, credential, "test@unittest.com");
  const lazyApimService = new Lazy(async () => apimService);
  const openApiProcessor = new OpenApiProcessor();
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
    ctx.config = new ConfigMap(Object.entries(apimConfig));
  }

  if (answer) {
    ctx.answers = answer;
  }
}

const aadConfig: IAadPluginConfig = {
  objectId: "",
  clientId: "",
  oauth2PermissionScopeId: "",
  applicationIdUris: "",
};
const functionConfig: IFunctionPluginConfig = {
  functionEndpoint: "",
};
const apimConfig = {
  apiDocumentPath: "openapi/openapi.json",
  apiPrefix: "apim-plugin-test",
};
const answer: Inputs = {
  [QuestionConstants.VSCode.Apim.questionName]: {
    id: QuestionConstants.VSCode.Apim.createNewApimOption,
    label: QuestionConstants.VSCode.Apim.createNewApimOption,
  },
  [QuestionConstants.VSCode.ApiVersion.questionName]: {
    id: QuestionConstants.VSCode.ApiVersion.createNewApiVersionOption,
    label: QuestionConstants.VSCode.ApiVersion.createNewApiVersionOption,
  },
  [QuestionConstants.VSCode.NewApiVersion.questionName]: "v1",
  platform: Platform.VS,
};
