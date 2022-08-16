// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  Providers,
  ResourceManagementClient,
  ResourceGroupsCheckExistenceResponse,
} from "@azure/arm-resources";
import {
  StorageManagementClient,
  StorageAccount,
  StorageAccountListResult,
  StorageAccountListKeysResult,
  StorageAccountCreateParameters,
} from "@azure/arm-storage";
import { TokenCredential } from "@azure/core-http";
import {
  WebSiteManagementClient,
  Site,
  AppServicePlan,
  AppServicePlanCollection,
  WebAppCollection,
} from "@azure/arm-appservice";

import { InfoMessages } from "../resources/message";
import { Logger } from "./logger";
import { Provider } from "@azure/arm-resources";

export class AzureClientFactory {
  /* TODO: we wrap the constructor to function and further discuss whether we should make it singleton.
   * We would better not make these client singleton, because they records credential.
   * It has security issue to put sensitive data in static memory address for long time.
   */
  public static getStorageManagementClient(
    credentials: TokenCredential,
    subscriptionId: string
  ): StorageManagementClient {
    return new StorageManagementClient(credentials, subscriptionId);
  }

  public static getWebSiteManagementClient(
    credentials: TokenCredential,
    subscriptionId: string
  ): WebSiteManagementClient {
    return new WebSiteManagementClient(credentials, subscriptionId);
  }

  public static getResourceManagementClient(
    credentials: TokenCredential,
    subscriptionId: string
  ): ResourceManagementClient {
    return new ResourceManagementClient(credentials, subscriptionId);
  }

  public static getResourceProviderClient(
    credentials: TokenCredential,
    subscriptionId: string
  ): Providers {
    return new ResourceManagementClient(credentials, subscriptionId).providers;
  }
}

export class AzureLib {
  public static async doesResourceGroupExist(
    client: ResourceManagementClient,
    resourceGroupName: string
  ): Promise<boolean> {
    const res: ResourceGroupsCheckExistenceResponse = await client.resourceGroups.checkExistence(
      resourceGroupName
    );
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

  public static async findResourceProvider(
    client: Providers,
    namespace: string
  ): Promise<Provider | undefined> {
    const provider = await client.get(namespace);
    if (provider.registrationState === "Registered") {
      return provider;
    }
  }

  public static async ensureResourceProviders(
    client: Providers,
    providerNamespaces: string[]
  ): Promise<Provider[]> {
    return Promise.all(
      providerNamespaces.map((namespace) =>
        this.ensureResource<Provider>(
          () => client.register(namespace),
          () => this.findResourceProvider(client, namespace)
        )
      )
    );
  }

  public static async findAppServicePlans(
    client: WebSiteManagementClient,
    resourceGroupName: string,
    appServicePlanName: string
  ): Promise<AppServicePlan | undefined> {
    for await (const page of client.appServicePlans
      .listByResourceGroup(resourceGroupName)
      .byPage({ maxPageSize: 100 })) {
      for (const appServicePlan of page) {
        if (appServicePlan.name === appServicePlanName) {
          return appServicePlan;
        }
      }
    }
    return undefined;
  }

  public static async ensureAppServicePlans(
    client: WebSiteManagementClient,
    resourceGroupName: string,
    appServicePlanName: string,
    options: AppServicePlan
  ): Promise<AppServicePlan> {
    return this.ensureResource<AppServicePlan>(
      () =>
        client.appServicePlans.beginCreateOrUpdateAndWait(
          resourceGroupName,
          appServicePlanName,
          options
        ),
      () => this.findAppServicePlans(client, resourceGroupName, appServicePlanName)
    );
  }

  public static async findStorageAccount(
    client: StorageManagementClient,
    resourceGroupName: string,
    storageName: string
  ): Promise<StorageAccount | undefined> {
    for await (const page of client.storageAccounts
      .listByResourceGroup(resourceGroupName)
      .byPage({ maxPageSize: 100 })) {
      for (const appServicePlan of page) {
        if (appServicePlan.name === storageName) {
          return appServicePlan;
        }
      }
    }
    return undefined;
  }

  public static async ensureStorageAccount(
    client: StorageManagementClient,
    resourceGroupName: string,
    storageName: string,
    params: StorageAccountCreateParameters
  ): Promise<StorageAccount> {
    return this.ensureResource<StorageAccount>(() =>
      client.storageAccounts.beginCreateAndWait(resourceGroupName, storageName, params)
    );
  }

  public static async getConnectionString(
    client: StorageManagementClient,
    resourceGroupName: string,
    storageAccountName: string
  ): Promise<string | undefined> {
    const keyList: StorageAccountListKeysResult = await client.storageAccounts.listKeys(
      resourceGroupName,
      storageAccountName
    );

    if (!keyList.keys || !keyList.keys[0]?.value) {
      return undefined;
    }

    const key: string = keyList.keys[0].value;
    return `DefaultEndpointsProtocol=https;AccountName=${storageAccountName};AccountKey=${key};EndpointSuffix=core.windows.net`;
  }

  public static async findFunctionApp(
    client: WebSiteManagementClient,
    resourceGroupName: string,
    functionAppName: string
  ): Promise<Site | undefined> {
    for await (const page of client.webApps
      .listByResourceGroup(resourceGroupName)
      .byPage({ maxPageSize: 100 })) {
      for (const appServicePlan of page) {
        if (appServicePlan.name === functionAppName) {
          return appServicePlan;
        }
      }
    }
    return undefined;
  }

  public static async ensureFunctionApp(
    client: WebSiteManagementClient,
    resourceGroupName: string,
    functionAppName: string,
    siteEnvelope: Site
  ): Promise<Site> {
    return this.ensureResource<Site>(
      () =>
        client.webApps.beginCreateOrUpdateAndWait(resourceGroupName, functionAppName, siteEnvelope),
      () => this.findFunctionApp(client, resourceGroupName, functionAppName)
    );
  }
}
