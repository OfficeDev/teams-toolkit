// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { createSandbox, SinonSandbox } from "sinon";
import dotenv from "dotenv";
import { AssertConfigNotEmpty } from "../../../../src/component/resource/apim/error";
import {
  IApimPluginConfig,
  IFunctionPluginConfig,
  SolutionConfig,
} from "../../../../src/component/resource/apim/config";
import {
  ApimPluginConfigKeys,
  TeamsToolkitComponent,
} from "../../../../src/component/resource/apim/constants";
import { Lazy } from "../../../../src/component/resource/apim/utils/commonUtils";
import { mockApimService, MockTokenCredentials } from "./mock";
import { ApimService } from "../../../../src/component/resource/apim/services/apimService";
import { ApimManager } from "../../../../src/component/resource/apim/managers/apimManager";
import { OpenApiProcessor } from "../../../../src/component/resource/apim/utils/openApiProcessor";
import { v3 } from "@microsoft/teamsfx-api";
import { IAnswer } from "../../../../src/component/resource/apim/answer";
dotenv.config();
chai.use(chaiAsPromised);

describe("ApimManager", () => {
  const sandbox = createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it("provision", async () => {
    const { apimManager } = buildApimManager(sandbox);
    const apimPluginConfig = buildApimPluginConfig();
    await apimManager.provision(apimPluginConfig);

    expect(apimPluginConfig.publisherEmail).equal("sample@microsoft.com");
    expect(apimPluginConfig.publisherName).equal("sample@microsoft.com");
  });

  it("deploy", async () => {
    const { apimManager, openApiProcessor, apimService } = buildApimManager(sandbox);
    const apimPluginConfig = buildApimPluginConfig();

    sandbox.stub(apimService, "createVersionSet").resolves();
    sandbox.stub(apimService, "importApi").resolves();
    const addApiToProductSpy = sandbox.stub(apimService, "addApiToProduct").resolves();
    sandbox.stub(openApiProcessor, "loadOpenApiDocument").resolves({
      spec: {
        info: {
          title: "getUserProfile",
          version: "v1",
        },
      },
    } as any);
    sandbox.stub(openApiProcessor, "patchOpenApiDocument").resolves({
      spec: {
        info: {
          title: "getUserProfile",
        },
      },
      schemaVersion: "v1",
    });
    sandbox.stub();

    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      config: { manifest: { appName: { short: "appname" } } },
      state: { solution: { resourceNameSuffix: "suffix" } },
    };
    const solutionConfig = new SolutionConfig(envInfo);
    const functionConfig: IFunctionPluginConfig = {
      functionEndpoint: "endpoint",
    };
    const answer = {
      apiDocumentPath: apiDocumentPath,
      apiId: "apiId",
      apiPrefix: apiPrefix,
      versionIdentity: "versionIdentity",
    };
    await apimManager.deploy(
      apimPluginConfig,
      solutionConfig,
      functionConfig,
      answer as IAnswer,
      "rootPath"
    );

    expect(addApiToProductSpy.calledOnce).equal(true);
    expect(
      addApiToProductSpy.calledOnceWithExactly(
        "test-resource-group-existing",
        "test-service-existing",
        "pname",
        "apiId"
      )
    ).equal(true);
  });
});

function buildApimManager(sandbox: SinonSandbox): {
  apimManager: ApimManager;
  openApiProcessor: OpenApiProcessor;
  apimService: ApimService;
} {
  const res = mockApimService(sandbox);
  sandbox.stub(res.apimService, "getService").resolves(undefined);
  res.credential = new MockTokenCredentials();
  const lazyApimService = new Lazy(async () => res.apimService);

  const openApiProcessor = new OpenApiProcessor();
  const apimManager = new ApimManager(lazyApimService, openApiProcessor);

  return {
    apimManager: apimManager,
    openApiProcessor: openApiProcessor,
    apimService: res.apimService,
  };
}

const productId = "/products/pname";
const authServerResourceId = "authorizationServers/authName";
const apiPrefix = "apiPrefix";
const apiDocumentPath = "apiPath";
const validServiceId =
  "/subscriptions/test-subscription-id/resourceGroups/test-resource-group-existing/providers/Microsoft.ApiManagement/service/test-service-existing";
function buildApimPluginConfig(objectId?: string, clientSecret?: string): IApimPluginConfig {
  return {
    serviceResourceId: validServiceId,
    apimClientAADObjectId: objectId,
    apimClientAADClientSecret: clientSecret,
    productResourceId: productId,
    authServerResourceId: authServerResourceId,
    apiPrefix: apiPrefix,
    apiDocumentPath: apiDocumentPath,
    checkAndGet(key: string): string {
      let res: string | undefined = undefined;
      if (key === ApimPluginConfigKeys.apimClientAADObjectId) {
        res = objectId;
      } else if (key === ApimPluginConfigKeys.apimClientAADClientSecret) {
        res = clientSecret;
      } else if (key === ApimPluginConfigKeys.serviceResourceId) {
        res = validServiceId;
      } else if (key === ApimPluginConfigKeys.apiPrefix) {
        res = apiPrefix;
      } else if (key === ApimPluginConfigKeys.apiDocumentPath) {
        res = apiDocumentPath;
      } else if (key === ApimPluginConfigKeys.productResourceId) {
        res = productId;
      } else if (key === ApimPluginConfigKeys.authServerResourceId) {
        res = authServerResourceId;
      }
      return AssertConfigNotEmpty(TeamsToolkitComponent.ApimPlugin, key, res, "dev");
    },
  };
}
