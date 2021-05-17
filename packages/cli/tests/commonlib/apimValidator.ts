// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios, { AxiosInstance } from "axios";
import * as chai from "chai";
import { ApiManagementClient } from "@azure/arm-apimanagement";
import fs from "fs-extra";
import md5 from "md5";
import { ResourceManagementClient } from "@azure/arm-resources";

import { AzureAccountProvider, GraphTokenProvider } from "@microsoft/teamsfx-api";

export class ApimValidator {
    static apimClient?: ApiManagementClient;
    static resourceGroupClient?: ResourceManagementClient;
    static axiosInstance?: AxiosInstance;

    public static async init(subscriptionId: string, azureAccountProvider: AzureAccountProvider, graphTokenProvider: GraphTokenProvider): Promise<void> {
        const tokenCredential = await azureAccountProvider.getAccountCredentialAsync();
        this.apimClient = new ApiManagementClient(tokenCredential!, subscriptionId);
        this.resourceGroupClient = new ResourceManagementClient(tokenCredential!, subscriptionId);
        const graphToken = await graphTokenProvider.getAccessToken();
        this.axiosInstance = axios.create({
            baseURL: "https://graph.microsoft.com/v1.0",
            headers: {
                authorization: `Bearer ${graphToken}`,
                "content-type": "application/json",
            },
        });
    }

    public static async prepareApiManagementService(resourceGroupName: string, serviceName: string): Promise<void> {
        await this.resourceGroupClient?.resourceGroups.createOrUpdate(resourceGroupName, {location: "eastus"});
        await this.apimClient?.apiManagementService.createOrUpdate(resourceGroupName, serviceName, {
            publisherName: "teamsfx-test@microsoft.com",
            publisherEmail: "teamsfx-test@microsoft.com",
            sku: {
                name: "Consumption",
                capacity: 0,
            },
            location: "eastus",
        });
    }

    public static async validateProvision(ctx: any, appName: string, resourceGroupName?: string, serviceName?: string, productId?: string, oAuthServerId?: string): Promise<void> {
        const config = new Config(ctx);
        chai.assert.isNotEmpty(config?.resourceNameSuffix);
        chai.assert.equal(config?.apimResourceGroupName, resourceGroupName);
        chai.assert.equal(config?.apimServiceName, serviceName ?? `${appName}am${config?.resourceNameSuffix}`);
        chai.assert.equal(config?.productId, productId ?? `${appName}-${config?.resourceNameSuffix}-product`);
        chai.assert.equal(config?.oAuthServerId, oAuthServerId ?? `${appName}-${config?.resourceNameSuffix}-server`);
        chai.assert.isNotEmpty(config?.apimClientAADObjectId);
        chai.assert.isNotEmpty(config?.apimClientAADClientId);
        chai.assert.isNotEmpty(config?.apimClientAADClientSecret);
        await this.validateApimService(config);
        await this.validateApimOAuthServer(config);
        await this.validateProduct(config);
        await this.validateAppAad(config);
        await this.validateClientAad(config);
    }

    public static async validateDeploy(ctx: any, projectPath: string, apiPrefix: string, apiVersion: string, apiDocumentPath?: string, versionSetId?: string, apiPath?: string): Promise<void> {
        const config = new Config(ctx);
        chai.assert.isNotEmpty(config?.resourceNameSuffix);
        chai.assert.equal(config?.apiPrefix, apiPrefix);
        chai.assert.equal(config?.apiDocumentPath, apiDocumentPath ?? "openapi/openapi.json");
        chai.assert.equal(config?.versionSetId, versionSetId ?? md5(`${apiPrefix}-${config?.resourceNameSuffix}`));
        chai.assert.equal(config?.apiPath, apiPath ?? `${apiPrefix}-${config?.resourceNameSuffix}`);

        await this.validateVersionSet(config);
        await this.validateApi(config, projectPath, apiVersion);
        await this.validateProductApi(config, apiVersion);
    }

    private static getApimInfo(config: Config): { resourceGroup: string, serviceName: string } {
        const resourceGroup = config?.apimResourceGroupName ?? config?.resourceGroupName;
        chai.assert.isNotEmpty(resourceGroup);
        const serviceName = config?.apimServiceName;
        chai.assert.isNotEmpty(serviceName);
        return { resourceGroup: resourceGroup!, serviceName: serviceName! };
    }

    private static async loadOpenApiSpec(config: Config, projectPath: string): Promise<any> {
        chai.assert.isNotEmpty(config?.apiDocumentPath);
        return await fs.readJson(`${projectPath}/${config?.apiDocumentPath}`);
    }

    private static async validateApimService(config: Config): Promise<void> {
        const apim = this.getApimInfo(config);
        const apimManagementService = await this.apimClient?.apiManagementService.get(apim.resourceGroup, apim.serviceName);
        chai.assert.isNotEmpty(apimManagementService);
        chai.assert.equal(apimManagementService?.sku.name, "Consumption");
    }

    private static async validateApimOAuthServer(config: Config): Promise<void> {
        const apim = this.getApimInfo(config);
        chai.assert.isNotEmpty(config?.oAuthServerId);
        const oAuthServer = await this.apimClient?.authorizationServer?.get(apim.resourceGroup, apim.serviceName, config?.oAuthServerId);
        chai.assert.isNotEmpty(oAuthServer);
        chai.assert.isNotEmpty(oAuthServer?.displayName);

        chai.assert.equal(oAuthServer?.clientId, config?.apimClientAADClientId);

        chai.assert.isNotEmpty(config?.applicationIdUris);
        chai.assert.equal(oAuthServer?.defaultScope, `${config?.applicationIdUris}/.default`);

        chai.assert.isNotEmpty(config?.tenantId);
        chai.assert.equal(oAuthServer?.authorizationEndpoint, `https://login.microsoftonline.com/${config?.tenantId}/oauth2/v2.0/authorize`);
        chai.assert.equal(oAuthServer?.tokenEndpoint, `https://login.microsoftonline.com/${config?.tenantId}/oauth2/v2.0/token`);
    }

    private static async validateProduct(config: Config): Promise<void> {
        const apim = this.getApimInfo(config);
        chai.assert.isNotEmpty(config?.productId);
        const product = await this.apimClient?.product?.get(apim.resourceGroup, apim.serviceName, config?.productId);
        chai.assert.isNotEmpty(product);
        chai.assert.isFalse(product?.subscriptionRequired);
    }

    private static async validateVersionSet(config: Config): Promise<void> {
        const apim = this.getApimInfo(config);
        chai.assert.isNotEmpty(config?.versionSetId);
        const versionSet = await this.apimClient?.apiVersionSet?.get(apim.resourceGroup, apim.serviceName, config?.versionSetId);
        chai.assert.isNotEmpty(versionSet);
    }

    private static async validateApi(config: Config, projectPath: string, apiVersion: string): Promise<any> {
        const apim = this.getApimInfo(config);
        const spec = await this.loadOpenApiSpec(config, projectPath);

        chai.assert.isNotEmpty(config?.apiPrefix);
        chai.assert.isNotEmpty(config?.resourceNameSuffix);
        const api = await this.apimClient?.api?.get(apim.resourceGroup, apim.serviceName, `${config?.apiPrefix}-${config?.resourceNameSuffix}-${apiVersion}`);
        chai.assert.isNotEmpty(api);
        chai.assert.equal(api?.path, `${config?.apiPrefix}-${config?.resourceNameSuffix}`);

        chai.assert.isNotEmpty(config?.oAuthServerId);
        chai.assert.equal(api?.authenticationSettings?.oAuth2?.authorizationServerId, `${config?.oAuthServerId}`);

        chai.assert.isNotEmpty(config?.versionSetId);
        chai.assert.include(api?.apiVersionSetId, config?.versionSetId);

        chai.assert.isNotEmpty(config?.functionEndpoint);
        chai.assert.equal(api?.serviceUrl, `${config?.functionEndpoint}/api`);

        chai.assert.equal(api?.displayName, spec.info.title);
        chai.assert.equal(api?.apiVersion, apiVersion);
        chai.assert.isFalse(api?.subscriptionRequired);
        chai.assert.includeMembers(api?.protocols ?? [], ["https"]);
    }

    private static async validateProductApi(config: Config, apiVersion: string): Promise<any> {
        const apim = this.getApimInfo(config);
        chai.assert.isNotEmpty(config?.productId);
        chai.assert.isNotEmpty(config?.apiPrefix);
        chai.assert.isNotEmpty(config?.resourceNameSuffix);

        const productApi = await this.apimClient?.productApi.checkEntityExists(apim.resourceGroup, apim.serviceName, config?.productId, `${config?.apiPrefix}-${config?.resourceNameSuffix}-${apiVersion}`);
        chai.assert.isNotEmpty(productApi);
    }

    private static async validateClientAad(config: Config): Promise<any> {
        chai.assert.isNotEmpty(config?.apimClientAADObjectId);
        const response = await this.axiosInstance?.get(`/applications/${config?.apimClientAADObjectId}`);

        const enableIdTokenIssuance = response?.data?.web.implicitGrantSettings?.enableIdTokenIssuance;
        chai.assert.isTrue(enableIdTokenIssuance);

        const passwordCredentials = response?.data?.passwordCredentials as any[];
        chai.assert.isNotEmpty(passwordCredentials);

        const requiredResourceAccess = response?.data?.requiredResourceAccess as any[];
        chai.assert.isNotEmpty(requiredResourceAccess);

        chai.assert.isNotEmpty(config?.clientId);
        chai.assert.include(requiredResourceAccess.map((x) => x?.resourceAppId as string), config?.clientId);

        chai.assert.isNotEmpty(config?.oauth2PermissionScopeId);
        const resourceAccessObj = requiredResourceAccess.find((x) => x?.resourceAppId === config?.clientId);
        chai.assert.deepInclude(resourceAccessObj.resourceAccess, { id: config?.oauth2PermissionScopeId, type: "Scope" });
    }

    private static async validateAppAad(config: Config): Promise<any> {
        chai.assert.isNotEmpty(config?.objectId);
        chai.assert.isNotEmpty(config?.apimClientAADClientId);

        const aadResponse = await this.axiosInstance?.get(`/applications/${config?.objectId}`);
        const knownClientApplications = aadResponse?.data?.api?.knownClientApplications as string[];
        chai.assert.isNotEmpty(knownClientApplications);
        chai.assert.include(knownClientApplications, config?.apimClientAADClientId);

        chai.assert.isNotEmpty(config?.clientId);
        const servicePrincipalResponse = await this.axiosInstance?.get(`/servicePrincipals?$filter=appId eq '${config?.clientId}'`);
        const servicePrincipals = servicePrincipalResponse?.data?.value as any[];
        chai.assert.isNotEmpty(servicePrincipals);
        chai.assert.include(servicePrincipals.map((sp) => sp.appId as string), config?.clientId);
    }
}

class Config {
    private readonly functionPlugin = "fx-resource-function";
    private readonly aadPlugin = "fx-resource-aad-app-for-teams";
    private readonly solution = "solution";
    private readonly apimPlugin = "fx-resource-apim";
    private readonly config: any;

    constructor(config: any) {
        this.config = config;
    }

    get functionEndpoint() { return this.config[this.functionPlugin]["functionEndpoint"]; }

    get objectId() { return this.config[this.aadPlugin]["objectId"]; }
    get clientId() { return this.config[this.aadPlugin]["clientId"]; }
    get oauth2PermissionScopeId() { return this.config[this.aadPlugin]["oauth2PermissionScopeId"]; }
    get applicationIdUris() { return this.config[this.aadPlugin]["applicationIdUris"]; }

    get subscriptionId() { return this.config[this.solution]["subscriptionId"]; }
    get resourceNameSuffix() { return this.config[this.solution]["resourceNameSuffix"]; }
    get tenantId() { return this.config[this.solution]["tenantId"]; }
    get resourceGroupName() { return this.config[this.solution]["resourceGroupName"]; }
    get location() { return this.config[this.solution]["location"]; }

    get apimResourceGroupName() { return this.config[this.apimPlugin]["resourceGroupName"]; }
    get apimServiceName() { return this.config[this.apimPlugin]["serviceName"]; }
    get productId() { return this.config[this.apimPlugin]["productId"]; }
    get oAuthServerId() { return this.config[this.apimPlugin]["oAuthServerId"]; }
    get apimClientAADObjectId() { return this.config[this.apimPlugin]["apimClientAADObjectId"]; }
    get apimClientAADClientId() { return this.config[this.apimPlugin]["apimClientAADClientId"]; }
    get apimClientAADClientSecret() { return this.config[this.apimPlugin]["apimClientAADClientSecret"]; }
    get apiPrefix() { return this.config[this.apimPlugin]["apiPrefix"]; }
    get versionSetId() { return this.config[this.apimPlugin]["versionSetId"]; }
    get apiPath() { return this.config[this.apimPlugin]["apiPath"]; }
    get apiDocumentPath() { return this.config[this.apimPlugin]["apiDocumentPath"]; }
}
