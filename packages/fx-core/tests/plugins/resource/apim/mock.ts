// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import {
  match,
  SinonMatcher,
  SinonSandbox,
  SinonStub,
  SinonStubbedInstance,
  SinonStubbedMember,
  StubbableType,
} from "sinon";
import { ApimService } from "../../../../src/component/resource/apim/services/apimService";
import {
  Api,
  ApiCreateOrUpdateOptionalParams,
  ApiCreateOrUpdateResponse,
  ApiManagementClient,
  ApiManagementService,
  ApiManagementServiceCreateOrUpdateOptionalParams,
  ApiManagementServiceCreateOrUpdateResponse,
  ApiManagementServiceGetOptionalParams,
  ApiManagementServiceGetResponse,
  ApiVersionSet,
  ApiVersionSetCreateOrUpdateOptionalParams,
  ApiVersionSetCreateOrUpdateResponse,
  ApiVersionSetGetOptionalParams,
  ApiVersionSetGetResponse,
  ProductApi,
  ProductApiCheckEntityExistsOptionalParams,
  ProductApiCheckEntityExistsResponse,
  ProductApiCreateOrUpdateOptionalParams,
  ProductApiCreateOrUpdateResponse,
} from "@azure/arm-apimanagement";
import { ResourceManagementClient } from "@azure/arm-resources";
import {
  ApiCreateOrUpdateParameter,
  ApiManagementServiceResource,
  ApiVersionSetContract,
} from "@azure/arm-apimanagement/src/models";
import axios, { AxiosInstance } from "axios";
import { IAadInfo } from "../../../../src/component/resource/apim/interfaces/IAadResource";
import { PluginContext } from "@microsoft/teamsfx-api";
import { newEnvInfo } from "../../../../src";
import { AccessToken, GetTokenOptions, TokenCredential } from "@azure/identity";

export type StubbedClass<T> = SinonStubbedInstance<T> & T;

export function createSinonStubInstance<T>(
  sandbox: SinonSandbox,
  constructor: StubbableType<T>,
  overrides?: { [K in keyof T]?: SinonStubbedMember<T[K]> }
): StubbedClass<T> {
  const stub = sandbox.createStubInstance<T>(constructor, overrides);
  return stub as unknown as StubbedClass<T>;
}

export const DefaultTestInput = {
  subscriptionId: "test-subscription-id",
  resourceGroup: {
    existing: "test-resource-group-existing",
    new: "test-resource-group-new",
  },
  apimServiceName: {
    existing: "test-service-existing",
    new: "test-service-new",
    error: "test-service-error",
  },
  versionSet: {
    existing: "test-version-set",
    new: "test-version-set-new",
    error: "test-version-set-error",
  },
  apiId: {
    existing: "test-api-id",
    new: "test-api-id-new",
    error: "test-api-id-error",
  },
  productId: {
    existing: "test-product-id",
    new: "test-product-id-new",
    error: "test-product-id-error",
  },
  aadDisplayName: {
    new: "test-aad-display-name-new",
    error: "test-aad-display-name-error",
  },
  aadObjectId: {
    created: "c390324c-7acd-4402-8ae7-dc9486d45cd0",
    new: "test-aad-object-id-new",
    error: "test-aad-object-id-error",
  },
  aadSecretDisplayName: {
    new: "test-aad-secret-display-name-new",
    error: "test-aad-secret-display-name-error",
  },
  aadClientId: {
    new: "test-aad-client-id-new",
    created: "de28501f-3727-4c8a-8782-f4f9ee1b9209",
    error: "test-aad-client-id-error",
  },
};

export const DefaultTestOutput = {
  createAad: {
    id: "c390324c-7acd-4402-8ae7-dc9486d45cd0",
    appId: "de28501f-3727-4c8a-8782-f4f9ee1b9209",
  },
  addSecret: {
    secretText: "test-secret-text",
  },
  getAad: {
    id: "c390324c-7acd-4402-8ae7-dc9486d45cd0",
    appId: "de28501f-3727-4c8a-8782-f4f9ee1b9209",
    displayName: "test-aad-display-name-created",
    requiredResourceAccess: [],
    web: {
      redirectUris: [],
      implicitGrantSettings: { enableIdTokenIssuance: false },
    },
  },
};

export function mockApimService(sandbox: SinonSandbox): {
  apimService: ApimService;
  apiManagementClient: StubbedClass<ApiManagementClient>;
  credential: MockTokenCredentials;
} {
  const apiManagementClient = createSinonStubInstance(sandbox, ApiManagementClient);
  const resourceProviderClient = createSinonStubInstance(sandbox, ResourceManagementClient);
  const credential = new MockTokenCredentials();
  const apimService = new ApimService(
    apiManagementClient,
    resourceProviderClient.providers,
    credential,
    DefaultTestInput.subscriptionId
  );

  return { apimService, apiManagementClient, credential };
}
export type MockApiManagementServiceInput = {
  resourceGroup: {
    new?: string;
    existing: string;
  };
  apimServiceName?: {
    existing?: string;
    error?: string;
  };
};
export function mockApiManagementService(
  sandbox: SinonSandbox,
  mockTestInput: MockApiManagementServiceInput = DefaultTestInput
): any {
  return {
    get: async function (
      resourceGroupName: string,
      serviceName: string,
      options?: ApiManagementServiceGetOptionalParams
    ): Promise<ApiManagementServiceGetResponse> {
      if (serviceName === mockTestInput.apimServiceName?.existing && !resourceGroupName) {
        return {
          name: "name",
          sku: {
            name: "skuName",
            capacity: 12,
          },
          location: "location",
          publisherEmail: "email",
          publisherName: "publisherName",
        };
      } else {
        return {
          name: "name2",
          sku: {
            name: "skuName2",
            capacity: 12,
          },
          location: "location2",
          publisherEmail: "email2",
          publisherName: "publisherName2",
        };
      }
    },
    beginCreateOrUpdateAndWait: async function (
      resourceGroupName: string,
      serviceName: string,
      parameters: ApiManagementServiceResource,
      options?: ApiManagementServiceCreateOrUpdateOptionalParams
    ): Promise<ApiManagementServiceCreateOrUpdateResponse> {
      if (serviceName !== mockTestInput.apimServiceName?.error) {
        return {
          sku: {
            name: "skuName",
            capacity: 12,
          },
          location: "location",
          publisherEmail: "email",
          publisherName: "publisherName",
        };
      } else {
        return {
          sku: {
            name: "skuName2",
            capacity: 12,
          },
          location: "location2",
          publisherEmail: "email2",
          publisherName: "publisherName2",
        };
      }
    },
  };
}

export function mockApiVersionSet(sandbox: SinonSandbox): any {
  return {
    get: async function (
      resourceGroupName: string,
      serviceName: string,
      versionSetId: string,
      options?: ApiVersionSetGetOptionalParams
    ): Promise<ApiVersionSetGetResponse> {
      if (versionSetId === DefaultTestInput.versionSet.existing) {
        return {
          name: "name",
        };
      } else {
        return {};
      }
    },
    createOrUpdate: async function (
      resourceGroupName: string,
      serviceName: string,
      versionSetId: string,
      parameters: ApiVersionSetContract,
      options?: ApiVersionSetCreateOrUpdateOptionalParams
    ): Promise<ApiVersionSetCreateOrUpdateResponse> {
      return {};
    },
  };
}

export function mockApi(sandbox: SinonSandbox): any {
  return {
    beginCreateOrUpdateAndWait: async function (
      resourceGroupName: string,
      serviceName: string,
      apiId: string,
      parameters: ApiCreateOrUpdateParameter,
      options?: ApiCreateOrUpdateOptionalParams
    ): Promise<ApiCreateOrUpdateResponse> {
      if (apiId !== DefaultTestInput.apiId.error) {
        return {
          name: "name",
        };
      } else {
        return {
          name: "name2",
        };
      }
    },
  };
}

export function mockProductApi(sandbox: SinonSandbox): any {
  return {
    createOrUpdate: async function (
      resourceGroupName: string,
      serviceName: string,
      productId: string,
      apiId: string,
      options?: ProductApiCreateOrUpdateOptionalParams
    ): Promise<ProductApiCreateOrUpdateResponse> {
      if (
        productId !== DefaultTestInput.productId.error &&
        apiId !== DefaultTestInput.apiId.error
      ) {
        return {
          name: "name",
        };
      } else {
        return {
          name: "name2",
        };
      }
    },
    checkEntityExists: async function (
      resourceGroupName: string,
      serviceName: string,
      productId: string,
      apiId: string,
      options?: ProductApiCheckEntityExistsOptionalParams
    ): Promise<ProductApiCheckEntityExistsResponse> {
      if (
        productId === DefaultTestInput.productId.existing &&
        apiId === DefaultTestInput.apiId.existing
      ) {
        return {
          body: true,
        };
      } else {
        return {
          body: false,
        };
      }
    },
  };
}

export class MockTokenCredentials implements TokenCredential {
  public async getToken(
    scopes: string | string[],
    options?: GetTokenOptions
  ): Promise<AccessToken | null> {
    return {
      token: "a.eyJ1c2VySWQiOiJ0ZXN0QHRlc3QuY29tIn0=.c",
      expiresOnTimestamp: 1234,
    };
  }
}

export type MockAxiosInput = {
  aadDisplayName?: { error?: string };
  aadObjectId?: { created?: string };
  aadClientId?: { created?: string };
};

export type MockAxiosOutput = {
  createAad?: {
    id: string;
    appId: string;
  };
  addSecret?: {
    secretText: string;
  };
  getAad?: IAadInfo;
};

export function mockAxios(
  sandbox: SinonSandbox,
  mockInput: MockAxiosInput = DefaultTestInput,
  mockOutput: MockAxiosOutput = DefaultTestOutput
): {
  axiosInstance: AxiosInstance;
  requestStub: any;
} {
  const mockAxiosInstance: any = axios.create();
  const requestStub = sandbox.stub(mockAxiosInstance, "request").rejects(UnexpectedInputError);

  // Create AAD (success)
  requestStub
    .withArgs(aadMatcher.createAad.and(match.has("data")))
    .resolves(buildAxiosResponse(mockOutput.createAad ?? DefaultTestOutput.createAad));

  // Create AAD (failed)
  if (mockInput?.aadDisplayName?.error) {
    requestStub
      .withArgs(
        aadMatcher.createAad.and(match.has("data", { displayName: mockInput.aadDisplayName.error }))
      )
      .rejects(buildError({ message: "error" }));
  }

  // Add secret
  requestStub
    .withArgs(aadMatcher.addSecret)
    .resolves(buildAxiosResponse(mockOutput.addSecret ?? DefaultTestOutput.addSecret));
  // Update AAD
  requestStub.withArgs(aadMatcher.updateAad).resolves(buildAxiosResponse({}));

  // Get AAD (not found)
  requestStub.withArgs(aadMatcher.getAad).resolves({});

  // Get AAD (existing)
  if (mockInput?.aadObjectId?.created) {
    requestStub
      .withArgs(
        aadMatcher.getAad.and(match.has("url", `/applications/${mockInput.aadObjectId.created}`))
      )
      .resolves(buildAxiosResponse(mockOutput?.getAad ?? DefaultTestOutput.getAad));
  }

  // Get ServicePrincipal (not found)
  requestStub.withArgs(aadMatcher.getServicePrincipals).resolves(
    buildAxiosResponse({
      value: [],
    })
  );

  // Get ServicePrincipal (existing)
  if (mockInput?.aadClientId?.created) {
    requestStub
      .withArgs(
        aadMatcher.getServicePrincipals.and(
          match.has("url", `/servicePrincipals?$filter=appId eq '${mockInput.aadClientId.created}'`)
        )
      )
      .resolves(
        buildAxiosResponse({
          value: [{}],
        })
      );
  }

  // Create ServicePrincipal
  requestStub.withArgs(aadMatcher.createServicePrincipal).resolves(buildAxiosResponse({}));

  mockAxiosInstance.request = requestStub;
  return { axiosInstance: mockAxiosInstance, requestStub: requestStub };
}

export const aadMatcher = {
  createAad: match.has("method", "post").and(match.has("url", "/applications")),
  addSecret: match
    .has("method", "post")
    .and(urlMatcher(["applications", undefined, "addPassword"])),
  updateAad: match.has("method", "patch").and(urlMatcher(["applications", undefined])),
  getAad: match.has("method", "get").and(urlMatcher(["applications", undefined])),
  getServicePrincipals: match
    .has("method", "get")
    .and(urlMatcher(["servicePrincipals", undefined])),
  createServicePrincipal: match.has("method", "post").and(urlMatcher(["servicePrincipals"])),
  body: (matcher: SinonMatcher | any) => match.has("data", matcher),
};

function urlMatcher(urls: (string | undefined)[]): SinonMatcher {
  return match.has(
    "url",
    match.string.and(
      match((value: string) => {
        const res = value.split(/\/|\?/);
        if (res.length < urls.length + 1) {
          return false;
        }
        for (let i = 0; i < urls.length; ++i) {
          if (urls[i] && res[i + 1] !== urls[i]) {
            return false;
          }
        }
        return true;
      })
    )
  );
}

function buildAxiosResponse(obj: any): any {
  return { data: obj };
}

function buildError(obj: any): Error {
  const error = new Error();
  return Object.assign(error, obj);
}

const UnexpectedInputError = new Error("Unexpected input");

export function mockContext(): PluginContext {
  const pluginContext = {
    config: new Map(),
    envInfo: newEnvInfo(
      undefined,
      undefined,
      new Map([
        [
          "solution",
          new Map([
            ["resourceNameSuffix", Math.random().toString(36).substring(2, 8)],
            ["subscriptionId", "1756abc0-3554-4341-8d6a-46674962ea19"],
            ["resourceGroupName", "apimTest"],
            ["location", "eastus"],
          ]),
        ],
      ])
    ),
    app: {
      name: {
        short: "hello-app",
      },
    },
    projectSettings: { appName: "hello-app" },
  } as unknown as PluginContext;
  return pluginContext;
}
