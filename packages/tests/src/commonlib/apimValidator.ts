// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios, { AxiosInstance } from "axios";
import * as chai from "chai";
import { ApiManagementClient } from "@azure/arm-apimanagement";
import fs from "fs-extra";
import md5 from "md5";
import { ResourceManagementClient } from "@azure/arm-resources";
import {
  AzureAccountProvider,
  M365TokenProvider,
} from "@microsoft/teamsfx-api";
import {
  getApimServiceNameFromResourceId,
  getAuthServiceNameFromResourceId,
  getproductNameFromResourceId,
  getResourceGroupNameFromResourceId,
} from "./utilities";
import { PluginId, StateConfigKey } from "./constants";
import { GraphScopes } from "@microsoft/teamsfx-core/build/common/tools";

export class ApimValidator {
  static apimClient?: ApiManagementClient;
  static resourceGroupClient?: ResourceManagementClient;
  static axiosInstance?: AxiosInstance;

  public static async init(
    subscriptionId: string,
    azureAccountProvider: AzureAccountProvider,
    m365TokenProvider: M365TokenProvider
  ): Promise<void> {
    const tokenCredential =
      await azureAccountProvider.getIdentityCredentialAsync();
    this.apimClient = new ApiManagementClient(tokenCredential!, subscriptionId);
    this.resourceGroupClient = new ResourceManagementClient(
      tokenCredential!,
      subscriptionId
    );
    const graphTokenRes = await m365TokenProvider.getAccessToken({
      scopes: GraphScopes,
    });
    const graphToken = graphTokenRes.isOk() ? graphTokenRes.value : undefined;
    this.axiosInstance = axios.create({
      baseURL: "https://graph.microsoft.com/v1.0",
      headers: {
        authorization: `Bearer ${graphToken}`,
        "content-type": "application/json",
      },
    });
  }

  public static async prepareApiManagementService(
    resourceGroupName: string,
    serviceName: string
  ): Promise<void> {
    await this.resourceGroupClient?.resourceGroups.createOrUpdate(
      resourceGroupName,
      {
        location: "eastus",
      }
    );
    await this.apimClient?.apiManagementService.beginCreateOrUpdateAndWait(
      resourceGroupName,
      serviceName,
      {
        publisherName: "teamsfx-test@microsoft.com",
        publisherEmail: "teamsfx-test@microsoft.com",
        sku: {
          name: "Consumption",
          capacity: 0,
        },
        location: "eastus",
      }
    );
  }

  public static async validateProvision(ctx: any): Promise<void> {
    console.log("Start validate apim provision.");
    const config = new Config(ctx);
    // chai.assert.isNotEmpty(config?.resourceNameSuffix);
    chai.assert.isNotEmpty(config?.serviceResourceId);
    chai.assert.isNotEmpty(config?.productResourceId);
    chai.assert.isNotEmpty(config?.authServerResourceId);
    chai.assert.isNotEmpty(config?.apimClientAADObjectId);
    chai.assert.isNotEmpty(config?.apimClientAADClientId);
    chai.assert.isNotEmpty(config?.apimClientAADClientSecret);
    await this.validateApimService(config);
    await this.validateApimOAuthServer(config);
    await this.validateProduct(config);
    await this.validateAppAad(config);
    await this.validateClientAad(config);
    console.log("[Successfully] validate apim provision.");
  }

  public static async validateDeploy(
    ctx: any,
    projectPath: string,
    apiPrefix: string,
    apiVersion: string,
    apiDocumentPath?: string,
    versionSetId?: string,
    apiPath?: string
  ): Promise<void> {
    console.log("Start validate apim deploy.");

    const config = new Config(ctx);
    chai.assert.isNotEmpty(config?.resourceNameSuffix);
    chai.assert.equal(config?.apiPrefix, apiPrefix);

    chai.assert.equal(
      config?.apiDocumentPath,
      apiDocumentPath ?? "openapi/openapi.json"
    );
    chai.assert.equal(
      config?.versionSetId,
      versionSetId ?? md5(`${apiPrefix}-${config?.resourceNameSuffix}`)
    );
    chai.assert.equal(
      config?.apiPath,
      apiPath ?? `${apiPrefix}-${config?.resourceNameSuffix}`
    );

    await this.validateVersionSet(config);
    await this.validateApi(config, projectPath, apiVersion);
    await this.validateProductApi(config, apiVersion);
    console.log("[Successfully] validate apim deploy.");
  }

  private static getApimInfo(config: Config): {
    resourceGroup: string;
    serviceName: string;
  } {
    chai.assert.isNotEmpty(config?.apimResourceGroupName);
    chai.assert.isNotEmpty(config?.serviceResourceId);
    const serviceName = getApimServiceNameFromResourceId(
      config?.serviceResourceId as string
    );

    chai.assert.isNotEmpty(serviceName);
    return {
      resourceGroup: config?.apimResourceGroupName,
      serviceName: serviceName!,
    };
  }

  private static async loadOpenApiSpec(
    config: Config,
    projectPath: string
  ): Promise<any> {
    chai.assert.isNotEmpty(config?.apiDocumentPath);
    return await fs.readJson(`${projectPath}/${config?.apiDocumentPath}`);
  }

  private static async validateApimService(config: Config): Promise<void> {
    const apim = this.getApimInfo(config);
    console.log(
      `validate apim service. Rg: ${apim.resourceGroup}, service name: ${apim.serviceName}`
    );
    const apimManagementService =
      await this.apimClient?.apiManagementService.get(
        apim.resourceGroup,
        apim.serviceName
      );
    chai.assert.isNotEmpty(apimManagementService);
    chai.assert.equal(apimManagementService?.sku.name, "Consumption");
  }

  private static async validateApimOAuthServer(config: Config): Promise<void> {
    const apim = this.getApimInfo(config);
    chai.assert.isNotEmpty(config?.authServerResourceId);
    console.log(
      `validate apim OAuth service. auth server resource id: ${config?.authServerResourceId}`
    );

    const oAuthServerId = getAuthServiceNameFromResourceId(
      config?.authServerResourceId as string
    );
    chai.assert.isNotEmpty(oAuthServerId);

    const oAuthServer = await this.apimClient?.authorizationServer?.get(
      apim.resourceGroup,
      apim.serviceName,
      oAuthServerId
    );
    chai.assert.isNotEmpty(oAuthServer);
    chai.assert.isNotEmpty(oAuthServer?.displayName);

    chai.assert.equal(oAuthServer?.clientId, config?.apimClientAADClientId);

    chai.assert.isNotEmpty(config?.applicationIdUris);
    chai.assert.equal(
      oAuthServer?.defaultScope,
      `${config?.applicationIdUris}/.default`
    );

    chai.assert.isNotEmpty(config?.teamsAppTenantId);
    chai.assert.equal(
      oAuthServer?.authorizationEndpoint,
      `https://login.microsoftonline.com/${config?.teamsAppTenantId}/oauth2/v2.0/authorize`
    );
    chai.assert.equal(
      oAuthServer?.tokenEndpoint,
      `https://login.microsoftonline.com/${config?.teamsAppTenantId}/oauth2/v2.0/token`
    );
  }

  private static async validateProduct(config: Config): Promise<void> {
    const apim = this.getApimInfo(config);
    chai.assert.isNotEmpty(config?.productResourceId);
    console.log(
      `validate apim product. auth product resource id: ${config?.productResourceId}`
    );

    const productId = getproductNameFromResourceId(
      config?.productResourceId as string
    );

    chai.assert.isNotEmpty(productId);
    const product = await this.apimClient?.product?.get(
      apim.resourceGroup,
      apim.serviceName,
      productId
    );
    chai.assert.isNotEmpty(product);
    chai.assert.isFalse(product?.subscriptionRequired);
  }

  private static async validateVersionSet(config: Config): Promise<void> {
    console.log("Validate version set");
    const apim = this.getApimInfo(config);
    chai.assert.isNotEmpty(config?.versionSetId);
    const versionSet = await this.apimClient?.apiVersionSet?.get(
      apim.resourceGroup,
      apim.serviceName,
      config?.versionSetId
    );
    chai.assert.isNotEmpty(versionSet);
  }

  private static async validateApi(
    config: Config,
    projectPath: string,
    apiVersion: string
  ): Promise<any> {
    console.log("Validate api");
    const apim = this.getApimInfo(config);
    const spec = await this.loadOpenApiSpec(config, projectPath);

    chai.assert.isNotEmpty(config?.apiPrefix);
    chai.assert.isNotEmpty(config?.resourceNameSuffix);
    const api = await this.apimClient?.api?.get(
      apim.resourceGroup,
      apim.serviceName,
      `${config?.apiPrefix}-${config?.resourceNameSuffix}-${apiVersion}`
    );
    chai.assert.isNotEmpty(api);
    chai.assert.equal(
      api?.path,
      `${config?.apiPrefix}-${config?.resourceNameSuffix}`
    );

    const oAuthServerId = getAuthServiceNameFromResourceId(
      config?.authServerResourceId as string
    );
    chai.assert.isNotEmpty(oAuthServerId);
    chai.assert.equal(
      api?.authenticationSettings?.oAuth2?.authorizationServerId,
      `${oAuthServerId}`
    );

    chai.assert.isNotEmpty(config?.versionSetId);
    chai.assert.include(api?.apiVersionSetId, config?.versionSetId);

    chai.assert.isNotEmpty(config?.functionEndpoint);
    chai.assert.equal(api?.serviceUrl, `${config?.functionEndpoint}/api`);

    chai.assert.equal(api?.displayName, spec.info.title);
    chai.assert.equal(api?.apiVersion, apiVersion);
    chai.assert.isFalse(api?.subscriptionRequired);
    chai.assert.includeMembers(api?.protocols ?? [], ["https"]);
  }

  private static async validateProductApi(
    config: Config,
    apiVersion: string
  ): Promise<any> {
    console.log("Validate product api");
    const apim = this.getApimInfo(config);
    chai.assert.isNotEmpty(config?.apiPrefix);
    chai.assert.isNotEmpty(config?.resourceNameSuffix);
    const productId = getproductNameFromResourceId(
      config?.productResourceId as string
    );

    chai.assert.isNotEmpty(productId);

    const productApi = await this.apimClient?.productApi.checkEntityExists(
      apim.resourceGroup,
      apim.serviceName,
      productId,
      `${config?.apiPrefix}-${config?.resourceNameSuffix}-${apiVersion}`
    );
    chai.assert.isNotEmpty(productApi);
  }

  private static async validateClientAad(config: Config): Promise<any> {
    console.log("Validate client aad");
    chai.assert.isNotEmpty(config?.apimClientAADObjectId);
    const response = await retry(
      async () => {
        try {
          return await this.axiosInstance?.get(
            `/applications/${config?.apimClientAADObjectId}`
          );
        } catch (error) {
          if (error?.response?.status == 404) {
            return undefined;
          }
          throw error;
        }
      },
      (response) => {
        return (
          !response ||
          response?.data?.passwordCredentials?.length == 0 ||
          response?.data?.requiredResourceAccess?.length === 0
        );
      }
    );

    const enableIdTokenIssuance =
      response?.data?.web.implicitGrantSettings?.enableIdTokenIssuance;
    chai.assert.isTrue(enableIdTokenIssuance);

    const passwordCredentials = response?.data?.passwordCredentials as any[];
    chai.assert.isNotEmpty(passwordCredentials);

    const requiredResourceAccess = response?.data
      ?.requiredResourceAccess as any[];
    chai.assert.isNotEmpty(requiredResourceAccess);

    chai.assert.isNotEmpty(config?.clientId);
    chai.assert.include(
      requiredResourceAccess.map((x) => x?.resourceAppId as string),
      config?.clientId
    );

    chai.assert.isNotEmpty(config?.oauth2PermissionScopeId);
    const resourceAccessObj = requiredResourceAccess.find(
      (x) => x?.resourceAppId === config?.clientId
    );
    chai.assert.deepInclude(resourceAccessObj.resourceAccess, {
      id: config?.oauth2PermissionScopeId,
      type: "Scope",
    });
  }

  private static async validateAppAad(config: Config): Promise<any> {
    console.log("Validate aad app");
    chai.assert.isNotEmpty(config?.objectId);
    chai.assert.isNotEmpty(config?.apimClientAADClientId);

    const aadResponse = await retry(
      async () => {
        try {
          return await this.axiosInstance?.get(
            `/applications/${config?.objectId}`
          );
        } catch (error) {
          if (error?.response?.status == 404) {
            return undefined;
          }
          throw error;
        }
      },
      (response) => {
        return (
          !response || response?.data?.api?.knownClientApplications.length === 0
        );
      }
    );
    const knownClientApplications = aadResponse?.data?.api
      ?.knownClientApplications as string[];
    chai.assert.isNotEmpty(knownClientApplications);
    chai.assert.include(knownClientApplications, config?.apimClientAADClientId);

    chai.assert.isNotEmpty(config?.clientId);
    const servicePrincipalResponse = await retry(
      async () => {
        return await this.axiosInstance?.get(
          `/servicePrincipals?$filter=appId eq '${config?.clientId}'`
        );
      },
      (response) => {
        return !response || response?.data?.value.length === 0;
      }
    );
    const servicePrincipals = servicePrincipalResponse?.data?.value as any[];
    chai.assert.isNotEmpty(servicePrincipals);
    chai.assert.include(
      servicePrincipals.map((sp) => sp.appId as string),
      config?.clientId
    );
  }
}

class Config {
  private readonly config: any;

  constructor(config: any) {
    this.config = config;
  }

  get functionEndpoint() {
    return this.config[PluginId.Function][StateConfigKey.functionEndpoint];
  }

  get objectId() {
    return this.config[PluginId.Aad][StateConfigKey.objectId];
  }
  get clientId() {
    return this.config[PluginId.Aad][StateConfigKey.clientId];
  }
  get oauth2PermissionScopeId() {
    return this.config[PluginId.Aad][StateConfigKey.oauth2PermissionScopeId];
  }
  get applicationIdUris() {
    return this.config[PluginId.Aad][StateConfigKey.applicationIdUris];
  }

  get subscriptionId() {
    return this.config[PluginId.Solution][StateConfigKey.subscriptionId];
  }
  get resourceNameSuffix() {
    return this.config[PluginId.Solution][StateConfigKey.resourceNameSuffix];
  }
  get teamsAppTenantId() {
    return this.config[PluginId.Solution][StateConfigKey.teamsAppTenantId];
  }
  get resourceGroupName() {
    return this.config[PluginId.Solution][StateConfigKey.resourceGroupName];
  }
  get location() {
    return this.config[PluginId.Solution][StateConfigKey.location];
  }

  get apimResourceGroupName() {
    return getResourceGroupNameFromResourceId(
      this.config[PluginId.Apim][StateConfigKey.serviceResourceId]
    );
  }
  get apimClientAADObjectId() {
    return this.config[PluginId.Apim][StateConfigKey.apimClientAADObjectId];
  }
  get apimClientAADClientId() {
    return this.config[PluginId.Apim][StateConfigKey.apimClientAADClientId];
  }
  get apimClientAADClientSecret() {
    return this.config[PluginId.Apim][StateConfigKey.apimClientAADClientSecret];
  }
  get apiPrefix() {
    return this.config[PluginId.Apim][StateConfigKey.apiPrefix];
  }
  get versionSetId() {
    return this.config[PluginId.Apim][StateConfigKey.versionSetId];
  }
  get apiPath() {
    return this.config[PluginId.Apim][StateConfigKey.apiPath];
  }
  get apiDocumentPath() {
    return this.config[PluginId.Apim][StateConfigKey.apiDocumentPath];
  }
  get serviceResourceId() {
    return this.config[PluginId.Apim][StateConfigKey.serviceResourceId];
  }
  get productResourceId() {
    return this.config[PluginId.Apim][StateConfigKey.productResourceId];
  }
  get authServerResourceId() {
    return this.config[PluginId.Apim][StateConfigKey.authServerResourceId];
  }
}

async function retry<T>(
  fn: (retries: number) => Promise<T>,
  condition: (result: T) => boolean,
  maxRetries = 20,
  retryTimeInterval = 1000
): Promise<T> {
  let executionIndex = 1;
  let result: T = await fn(executionIndex);
  while (executionIndex <= maxRetries && condition(result)) {
    await delay(executionIndex * retryTimeInterval);
    result = await fn(executionIndex);
    ++executionIndex;
  }
  return result;
}

function delay(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }

  // tslint:disable-next-line no-string-based-set-timeout
  return new Promise((resolve) => setTimeout(resolve, ms));
}
