// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ResourceManagementClient, ResourceManagementModels } from "@azure/arm-resources";
import { StorageManagementClient, StorageManagementModels } from "@azure/arm-storage";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import { WebSiteManagementClient, WebSiteManagementModels } from "@azure/arm-appservice";

import { InfoMessages } from "../resources/message";
import { Logger } from "./logger";

export class AzureClientFactory {
    /* TODO: we wrap the constructor to function and further discuss whether we should make it singleton.
     * We would better not make these client singleton, because they records credential.
     * It has security issue to put sensitive data in static memory address for long time.
     */
    public static getStorageManagementClient(credentials: TokenCredentialsBase, subscriptionId: string): StorageManagementClient {
        return new StorageManagementClient(credentials, subscriptionId);
    }

    public static getWebSiteManagementClient(credentials: TokenCredentialsBase, subscriptionId: string): WebSiteManagementClient {
        return new WebSiteManagementClient(credentials, subscriptionId);
    }

    public static getResourceManagementClient(credentials: TokenCredentialsBase, subscriptionId: string): ResourceManagementClient {
        return new ResourceManagementClient(credentials, subscriptionId);
    }
}

type Site = WebSiteManagementModels.Site;
type AppServicePlan = WebSiteManagementModels.AppServicePlan;
type AppServicePlanCollection = WebSiteManagementModels.AppServicePlanCollection;

type StorageAccount = StorageManagementModels.StorageAccount;
type StorageAccountListResult = StorageManagementModels.StorageAccountListResult;
type StorageAccountListKeysResult = StorageManagementModels.StorageAccountListKeysResult;
type StorageAccountCreateParameters = StorageManagementModels.StorageAccountCreateParameters;

type ResourceGroupsCheckExistenceResponse = ResourceManagementModels.ResourceGroupsCheckExistenceResponse;

export class AzureLib {
    public static async doesResourceGroupExist(client: ResourceManagementClient, resourceGroupName: string): Promise<boolean> {
        const res: ResourceGroupsCheckExistenceResponse = await client.resourceGroups.checkExistence(resourceGroupName);
        return res.body;
    }

    private static async ensureResource<T>(
        createFn: () => Promise<T>,
        findFn?: () => Promise<T | undefined>
    ): Promise<T> {
        const _t: T | undefined = await findFn?.();
        if (!_t) {
            return createFn();
        }
        Logger.info(InfoMessages.resourceExists);
        return _t;
    }

    public static async findAppServicePlans(
        client: WebSiteManagementClient, resourceGroupName: string,
        appServicePlanName: string): Promise<AppServicePlan | undefined> {

        const appServicePlansRes: AppServicePlanCollection =
            await client.appServicePlans.listByResourceGroup(resourceGroupName);
        return appServicePlansRes.find(plan => plan.name === appServicePlanName);
    }

    public static async ensureAppServicePlans(
        client: WebSiteManagementClient, resourceGroupName: string,
        appServicePlanName: string, options: AppServicePlan): Promise<AppServicePlan> {

        return this.ensureResource<AppServicePlan>(
            () => client.appServicePlans.createOrUpdate(resourceGroupName, appServicePlanName, options),
            () => this.findAppServicePlans(client, resourceGroupName, appServicePlanName)
        );
    }

    public static async findStorageAccount(
        client: StorageManagementClient, resourceGroupName: string,
        storageName: string): Promise<StorageAccount | undefined> {

        const storageAccountListResult: StorageAccountListResult =
            await client.storageAccounts.listByResourceGroup(resourceGroupName);
        return storageAccountListResult.find(storageAccount => storageAccount.name === storageName);
    }

    public static async ensureStorageAccount(
        client: StorageManagementClient, resourceGroupName: string, storageName: string,
        params: StorageAccountCreateParameters): Promise<StorageAccount> {

        return this.ensureResource<StorageAccount>(
            () => client.storageAccounts.create(resourceGroupName, storageName, params)
        );
    }

    public static async getConnectionString(
        client: StorageManagementClient, resourceGroupName: string,
        storageAccountName: string): Promise<string | undefined> {

        const keyList: StorageAccountListKeysResult =
            await client.storageAccounts.listKeys(resourceGroupName, storageAccountName);

        if (!keyList.keys || !keyList.keys[0]?.value) {
            return undefined;
        }

        const key: string = keyList.keys[0].value;
        return `DefaultEndpointsProtocol=https;AccountName=${storageAccountName};AccountKey=${key};EndpointSuffix=core.windows.net`;
    }

    public static async findFunctionApp(
        client: WebSiteManagementClient, resourceGroupName: string,
        functionAppName: string): Promise<Site | undefined> {

        const webAppCollection: WebSiteManagementModels.WebAppCollection =
            await client.webApps.listByResourceGroup(resourceGroupName);

        return webAppCollection.find(webApp => webApp.name === functionAppName);
    }

    public static async ensureFunctionApp(
        client: WebSiteManagementClient, resourceGroupName: string,
        functionAppName: string, siteEnvelope: Site): Promise<Site> {

        return this.ensureResource<Site>(
            () => client.webApps.createOrUpdate(resourceGroupName, functionAppName, siteEnvelope)
        );
    }
}
