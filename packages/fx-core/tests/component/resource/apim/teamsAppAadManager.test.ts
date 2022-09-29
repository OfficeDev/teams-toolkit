// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { createSandbox, SinonSandbox } from "sinon";
import dotenv from "dotenv";
import { AadService } from "../../../../src/component/resource/apim/services/aadService";
import {
  IAadPluginConfig,
  IApimPluginConfig,
} from "../../../../src/component/resource/apim/config";
import { TeamsAppAadManager } from "../../../../src/component/resource/apim/managers/teamsAppAadManager";
import {
  ApimPluginConfigKeys,
  TeamsToolkitComponent,
} from "../../../../src/component/resource/apim/constants";
import { Lazy } from "../../../../src/component/resource/apim/utils/commonUtils";
import { AssertConfigNotEmpty } from "../../../../src/component/resource/apim/error";
import { mockAxios, MockAxiosInput, MockAxiosOutput } from "./mock";
dotenv.config();
chai.use(chaiAsPromised);

describe("TeamsAppAadManager", () => {
  describe("#postProvision()", () => {
    const sandbox = createSandbox();
    afterEach(() => {
      sandbox.restore();
    });

    it("Create a new service principal.", async () => {
      // Arrange
      const testObjectId = "test-object-id";
      const testClientId = "test-client-id";
      const aadConfig = buildAadPluginConfig(testObjectId, testClientId);
      const apimConfig = buildApimPluginConfig("test-apim-client-id");
      const { teamsAppAadManager, requestStub } = buildTeamsAppAadManager(sandbox);
      // Act
      await teamsAppAadManager.postProvision(aadConfig, apimConfig);

      // Assert
      sandbox.assert.calledThrice(requestStub);
      sandbox.assert.calledWithMatch(requestStub, {
        method: "get",
        url: `/servicePrincipals?$filter=appId eq '${testClientId}'`,
        data: undefined,
      });
      sandbox.assert.calledWithMatch(requestStub, {
        method: "post",
        url: `/servicePrincipals`,
        data: { appId: testClientId },
      });
      sandbox.assert.calledWithMatch(requestStub, {
        method: "patch",
        url: `/applications/${testObjectId}`,
        data: { api: { knownClientApplications: ["test-apim-client-id"] } },
      });
    });
  });
});

function buildAadPluginConfig(objectId: string, clientId: string): IAadPluginConfig {
  return {
    objectId: objectId,
    clientId: clientId,
    oauth2PermissionScopeId: "",
    applicationIdUris: "",
  };
}

function buildTeamsAppAadManager(
  sandbox: SinonSandbox,
  mockInput?: MockAxiosInput,
  mockOutput?: MockAxiosOutput
): {
  teamsAppAadManager: TeamsAppAadManager;
  requestStub: any;
} {
  const res = mockAxios(sandbox, mockInput, mockOutput);
  const requestStub = res.requestStub;
  const axiosInstance = res.axiosInstance;
  const lazyAadService = new Lazy(
    async () => new AadService(axiosInstance, undefined, undefined, 2)
  );
  const aadManager = new TeamsAppAadManager(lazyAadService);
  return { teamsAppAadManager: aadManager, requestStub: requestStub };
}

function buildApimPluginConfig(clientId: string): IApimPluginConfig {
  return {
    apimClientAADClientId: clientId,
    checkAndGet(key: string): string {
      let res: string | undefined = undefined;
      if (key === ApimPluginConfigKeys.apimClientAADClientId) {
        res = clientId;
      }
      return AssertConfigNotEmpty(TeamsToolkitComponent.ApimPlugin, key, res, "dev");
    },
  };
}
