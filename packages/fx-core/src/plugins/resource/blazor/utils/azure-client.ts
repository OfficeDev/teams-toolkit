// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Providers, ResourceManagementClientContext } from "@azure/arm-resources";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";

import { WebSiteManagementClient, WebSiteManagementModels } from "@azure/arm-appservice";
import { Provider } from "@azure/arm-resources/esm/models";

export class AzureClientFactory {
  public static getResourceProviderClient(
    credentials: TokenCredentialsBase,
    subscriptionId: string
  ): Providers {
    return new Providers(new ResourceManagementClientContext(credentials, subscriptionId));
  }

  public static getWebSiteManagementClient(
    credentials: TokenCredentialsBase,
    subscriptionId: string
  ): WebSiteManagementClient {
    return new WebSiteManagementClient(credentials, subscriptionId);
  }
}

type Site = WebSiteManagementModels.Site;
type AppServicePlan = WebSiteManagementModels.AppServicePlan;
type AppServicePlanCollection = WebSiteManagementModels.AppServicePlanCollection;

export class AzureLib {
  public static async ensureResource<T>(
    createFn: () => Promise<T>,
    findFn?: () => Promise<T | undefined>
  ): Promise<T> {
    const _t: T | undefined = await findFn?.();
    return _t ?? createFn();
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
        AzureLib.ensureResource(
          () => client.register(namespace),
          () => AzureLib.findResourceProvider(client, namespace)
        )
      )
    );
  }

  public static async findAppServicePlans(
    client: WebSiteManagementClient,
    resourceGroupName: string,
    appServicePlanName: string
  ): Promise<AppServicePlan | undefined> {
    const appServicePlansRes: AppServicePlanCollection =
      await client.appServicePlans.listByResourceGroup(resourceGroupName);
    return appServicePlansRes.find((plan) => plan.name === appServicePlanName);
  }

  public static async ensureAppServicePlan(
    client: WebSiteManagementClient,
    resourceGroupName: string,
    appServicePlanName: string,
    options: AppServicePlan
  ): Promise<AppServicePlan> {
    return this.ensureResource<AppServicePlan>(
      () => client.appServicePlans.createOrUpdate(resourceGroupName, appServicePlanName, options),
      () => this.findAppServicePlans(client, resourceGroupName, appServicePlanName)
    );
  }

  public static async findWebApp(
    client: WebSiteManagementClient,
    resourceGroupName: string,
    webAppName: string
  ): Promise<Site | undefined> {
    const webAppCollection: WebSiteManagementModels.WebAppCollection =
      await client.webApps.listByResourceGroup(resourceGroupName);

    return webAppCollection.find((webApp) => webApp.name === webAppName);
  }

  public static async ensureWebApp(
    client: WebSiteManagementClient,
    resourceGroupName: string,
    webAppName: string,
    siteEnvelope: Site
  ): Promise<Site> {
    return this.ensureResource<Site>(
      () => client.webApps.createOrUpdate(resourceGroupName, webAppName, siteEnvelope),
      () => this.findWebApp(client, resourceGroupName, webAppName)
    );
  }
}
