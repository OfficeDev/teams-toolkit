// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as appService from "@azure/arm-appservice";
import { default as axios } from "axios";

export class AzureOperations {
  public static async CreateOrUpdateAppServicePlan(
    webSiteMgmtClient: appService.WebSiteManagementClient,
    resourceGroup: string,
    appServicePlanName: string,
    appServicePlan: appService.WebSiteManagementModels.AppServicePlan
  ): Promise<void> {
    await webSiteMgmtClient.appServicePlans.createOrUpdate(
      resourceGroup,
      appServicePlanName,
      appServicePlan
    );
  }

  public static async CreateOrUpdateAzureWebApp(
    webSiteMgmtClient: appService.WebSiteManagementClient,
    resourceGroup: string,
    siteName: string,
    siteEnvelope: appService.WebSiteManagementModels.Site
  ): Promise<any> {
    return await webSiteMgmtClient.webApps.createOrUpdate(resourceGroup, siteName, siteEnvelope);
  }

  public static async ListPublishingCredentials(
    webSiteMgmtClient: appService.WebSiteManagementClient,
    resourceGroup: string,
    siteName: string
  ): Promise<any> {
    return await webSiteMgmtClient.webApps.listPublishingCredentials(resourceGroup, siteName);
  }

  public static async ZipDeployPackage(
    zipDeployEndpoint: string,
    zipBuffer: Buffer,
    config: any
  ): Promise<void> {
    await axios.post(zipDeployEndpoint, zipBuffer, config);
  }
}
