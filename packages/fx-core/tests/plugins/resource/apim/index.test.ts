// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import dotenv from "dotenv";
import { ApimPlugin } from "../../../../src/plugins/resource/apim/index";
import { v4 } from "uuid";
import {
  AadHelper,
  after_if,
  before_if,
  EnvConfig,
  it_if,
  MockAzureAccountProvider,
  MockGraphTokenProvider,
  MockPluginContext,
  ResourceGroupHelper,
} from "./testUtil";
import { Inputs, Platform, PluginContext } from "@microsoft/teamsfx-api";
import {
  AadDefaultValues,
  QuestionConstants,
} from "../../../../src/plugins/resource/apim/constants";
import axios from "axios";
import { AssertNotEmpty } from "../../../../src/plugins/resource/apim/error";
import { ApiManagementClient } from "@azure/arm-apimanagement";
import { AadService } from "../../../../src/plugins/resource/apim/services/aadService";
import { ApimService } from "../../../../src/plugins/resource/apim/services/apimService";
import {
  IAadPluginConfig,
  IApimPluginConfig,
  IFunctionPluginConfig,
  ISolutionConfig,
} from "../../../../src/plugins/resource/apim/config";
dotenv.config();
chai.use(chaiAsPromised);

const UT_SUFFIX: string = v4().substring(0, 6);
const UT_RESOURCE_NAME = `fx-apim-local-unit-test-index-${UT_SUFFIX}`;
const UT_RESOURCE_GROUP = `fx-apim-local-unit-test-index-${UT_SUFFIX}`;
const UT_SCOPE_ID = v4();
const UT_IDENTITY_URL = `api://${v4()}`;
const testFunctionEndpoint = "https://test-endpoint";

describe("ApimPlugin", () => {
  let services: {
    aadService: AadService;
    aadHelper: AadHelper;
    apimService: ApimService;
    resourceGroupHelper: ResourceGroupHelper;
  };
  let aadClientId = "";
  let aadObjectId = "";

  before_if(EnvConfig.enableTest, async () => {
    services = await buildService();
    await services.resourceGroupHelper.createResourceGroup(
      UT_RESOURCE_GROUP,
      EnvConfig.defaultLocation
    );
    const aadInfo = await services.aadService.createAad(UT_RESOURCE_NAME);
    aadClientId = aadInfo.appId ?? "";
    aadObjectId = aadInfo.id ?? "";
    await services.aadService.updateAad(aadInfo.id ?? "", {
      identifierUris: [UT_IDENTITY_URL],
      api: {
        oauth2PermissionScopes: [
          {
            adminConsentDescription: "Test consent description",
            adminConsentDisplayName: "Test display name",
            id: UT_SCOPE_ID,
            isEnabled: true,
            type: "User",
            userConsentDescription: "Test consent description",
            userConsentDisplayName: "Test display name",
            value: "access_as_user",
          },
        ],
      },
    });
  });

  after_if(EnvConfig.enableTest, async () => {
    services.aadHelper.deleteAadByName(UT_RESOURCE_NAME);
    services.aadHelper.deleteAadByName(`${UT_RESOURCE_NAME}-client`);
    services.resourceGroupHelper.deleteResourceGroup(UT_RESOURCE_GROUP);
  });

  describe("Happy path", () => {
    const apimPlugin = new ApimPlugin();
    it_if(EnvConfig.enableTest, "First time create", async () => {
      const ctx = await buildContext(UT_RESOURCE_NAME, UT_SUFFIX, aadObjectId, aadClientId);

      let result = await apimPlugin.scaffold(ctx);
      chai.assert.isTrue(result.isOk(), "Operation apimPlugin.scaffold should be succeeded.");
      result = await apimPlugin.provision(ctx);
      chai.assert.isTrue(result.isOk(), "Operation apimPlugin.provision should be succeeded.");
      result = await apimPlugin.postProvision(ctx);
      chai.assert.isTrue(result.isOk(), "Operation apimPlugin.postProvision should be succeeded.");
      result = await apimPlugin.deploy(ctx);
      chai.assert.isTrue(result.isOk(), "Operation apimPlugin.deploy should be succeeded.");
    });
  });
});

async function buildContext(
  resourceName: string,
  resourceNameSuffix: string,
  aadObjectId: string,
  aadClientId: string
): Promise<PluginContext> {
  const aadConfig: IAadPluginConfig = {
    objectId: aadObjectId,
    clientId: aadClientId,
    oauth2PermissionScopeId: UT_SCOPE_ID,
    applicationIdUris: UT_IDENTITY_URL,
  };
  const functionConfig: IFunctionPluginConfig = {
    functionEndpoint: testFunctionEndpoint,
  };
  const apimConfig: IApimPluginConfig = {
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
  const ctx = new MockPluginContext(
    resourceName,
    buildSolutionConfig(resourceNameSuffix),
    aadConfig,
    functionConfig,
    apimConfig,
    answer
  );
  await ctx.init();
  return ctx;
}

function buildSolutionConfig(resourceNameSuffix: string): ISolutionConfig {
  return {
    resourceNameSuffix: resourceNameSuffix,
    resourceGroupName: UT_RESOURCE_GROUP,
    teamsAppTenantId: EnvConfig.tenantId,
    location: EnvConfig.defaultLocation,
  };
}

async function buildService(): Promise<{
  aadService: AadService;
  aadHelper: AadHelper;
  apimService: ApimService;
  resourceGroupHelper: ResourceGroupHelper;
}> {
  const mockGraphTokenProvider = new MockGraphTokenProvider(
    EnvConfig.tenantId,
    EnvConfig.servicePrincipalClientId,
    EnvConfig.servicePrincipalClientSecret
  );
  const graphToken = await mockGraphTokenProvider.getAccessToken();
  const axiosInstance = axios.create({
    baseURL: AadDefaultValues.graphApiBasePath,
    headers: {
      authorization: `Bearer ${graphToken}`,
      "content-type": "application/json",
    },
  });

  const aadHelper = new AadHelper(axiosInstance);
  const aadService = new AadService(axiosInstance);

  const mockAzureAccountProvider = new MockAzureAccountProvider();
  await mockAzureAccountProvider.login(
    EnvConfig.servicePrincipalClientId,
    EnvConfig.servicePrincipalClientSecret,
    EnvConfig.tenantId
  );
  const credential = AssertNotEmpty(
    "credential",
    await mockAzureAccountProvider.getAccountCredentialAsync()
  );

  const apiManagementClient = new ApiManagementClient(credential, EnvConfig.subscriptionId);
  const apimService = new ApimService(apiManagementClient, credential, EnvConfig.subscriptionId);
  const resourceGroupHelper = new ResourceGroupHelper(credential, EnvConfig.subscriptionId);

  return {
    aadService: aadService,
    aadHelper: aadHelper,
    apimService: apimService,
    resourceGroupHelper: resourceGroupHelper,
  };
}
