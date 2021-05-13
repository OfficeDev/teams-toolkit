// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";
import dotenv from "dotenv";
import {
  MockGraphTokenProvider,
  it_if,
  before_if,
  after_if,
  AadHelper,
  EnvConfig,
} from "./testUtil";
import { AadService } from "../../../../src/plugins/resource/apim/services/aadService";
import { IAadPluginConfig } from "../../../../src/plugins/resource/apim/config";
import { TeamsAppAadManager } from "../../../../src/plugins/resource/apim/managers/teamsAppAadManager";
import axios, { AxiosInstance } from "axios";
import { AadDefaultValues } from "../../../../src/plugins/resource/apim/constants";
import { assert } from "sinon";
import { Lazy } from "../../../../src/plugins/resource/apim/utils/commonUtils";
import { v4 } from "uuid";
dotenv.config();
chai.use(chaiAsPromised);

const UT_SUFFIX = v4().substring(0, 6);
const UT_AAD_NAME = `fx-apim-local-unit-test-aad-${UT_SUFFIX}`;

describe("TeamsAppAadManager", () => {
  let teamsAppAadManager: TeamsAppAadManager;
  let aadService: AadService;
  let axios: AxiosInstance;
  let aadHelper: AadHelper;
  before(async () => {
    const result = await buildService(EnvConfig.enableTest);
    axios = result.axiosInstance;
    aadService = result.aadService;
    aadHelper = result.aadHelper;
    teamsAppAadManager = result.teamsAppAadManager;
  });

  describe("#postProvision()", () => {
    const sandbox = sinon.createSandbox();
    let testObjectId = "";
    let testClientId = "";

    before_if(EnvConfig.enableTest, async () => {
      const aadInfo = await aadService.createAad(UT_AAD_NAME);
      testObjectId = aadInfo.id ?? "";
      testClientId = aadInfo.appId ?? "";
    });

    after_if(EnvConfig.enableTest, async () => {
      await aadHelper.deleteAadByName(UT_AAD_NAME);
    });

    afterEach(function () {
      sandbox.restore();
    });

    it_if(EnvConfig.enableTest, "Create a new service principal.", async () => {
      // Arrange
      const spy = sandbox.spy(axios, "request");
      const aadConfig = buildAadPluginConfig(testObjectId, testClientId);

      // Act
      await teamsAppAadManager.postProvision(aadConfig, { apimClientAADClientId: testClientId });

      // Assert
      assert.calledThrice(spy);
      assert.calledWithMatch(spy, {
        method: "get",
        url: `/servicePrincipals?$filter=appId eq '${testClientId}'`,
        data: undefined,
      });
      assert.calledWithMatch(spy, {
        method: "post",
        url: `/servicePrincipals`,
        data: { appId: testClientId },
      });
      assert.calledWithMatch(spy, {
        method: "patch",
        url: `/applications/${testObjectId}`,
        data: { api: { knownClientApplications: [testClientId] } },
      });
    });
  });
});

async function buildService(
  enableLogin: boolean
): Promise<{
  axiosInstance: AxiosInstance;
  aadService: AadService;
  teamsAppAadManager: TeamsAppAadManager;
  aadHelper: AadHelper;
}> {
  const mockGraphTokenProvider = new MockGraphTokenProvider(
    EnvConfig.tenantId,
    EnvConfig.servicePrincipalClientId,
    EnvConfig.servicePrincipalClientSecret
  );
  const graphToken = enableLogin ? await mockGraphTokenProvider.getAccessToken() : "";
  const axiosInstance = axios.create({
    baseURL: AadDefaultValues.graphApiBasePath,
    headers: {
      authorization: `Bearer ${graphToken}`,
      "content-type": "application/json",
    },
  });
  const aadService = new AadService(axiosInstance);
  const lazyAadService = new Lazy<AadService>(() => Promise.resolve(aadService));
  const teamsAppAadManager = new TeamsAppAadManager(lazyAadService);
  const aadHelper = new AadHelper(axiosInstance);

  return { axiosInstance, aadService, teamsAppAadManager, aadHelper };
}

function buildAadPluginConfig(objectId: string, clientId: string): IAadPluginConfig {
  return {
    objectId: objectId,
    clientId: clientId,
    oauth2PermissionScopeId: "",
    applicationIdUris: "",
  };
}
