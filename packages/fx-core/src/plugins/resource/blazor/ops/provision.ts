// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { NameValuePair, Site } from "@azure/arm-appservice/esm/models/mappers";
import { WebSiteManagementClient, WebSiteManagementModels } from "@azure/arm-appservice";

import { AzureInfo, Constants, DefaultProvisionConfigs, RegularExpr } from "../constants";
import { AzureLib } from "../utils/azure-client";
import { TeamsClientId } from "../../../../common/constants";

type Site = WebSiteManagementModels.Site;
type NameValuePair = WebSiteManagementModels.NameValuePair;
type SiteAuthSettings = WebSiteManagementModels.SiteAuthSettings;

export class BlazorNaming {
  private static normalize(raw: string): string {
    return raw.replace(RegularExpr.allCharToBeSkippedInName, Constants.emptyString).toLowerCase();
  }

  private static concatName(appName: string, mergedSuffix: string): string {
    const suffix = this.normalize(mergedSuffix).substr(0, AzureInfo.suffixLenMax);
    const paddingLength = AzureInfo.resourceNameLenMax - suffix.length;
    const normalizedAppName = this.normalize(appName).substr(0, paddingLength);
    return normalizedAppName + suffix;
  }

  public static generateWebAppName(
    appName: string,
    classSuffix: string,
    identSuffix: string
  ): string {
    const mergedSuffix: string = classSuffix + identSuffix;
    return this.concatName(appName, mergedSuffix);
  }
}

export class BlazorProvision {
  public static async ensureWebApp(
    client: WebSiteManagementClient,
    resourceGroupName: string,
    location: string,
    webAppName: string,
    appServiceId: string
  ): Promise<Site> {
    const siteEnvelope: Site = {
      ...DefaultProvisionConfigs.webAppConfig(location),
      serverFarmId: appServiceId,
    };

    const site = await AzureLib.ensureWebApp(client, resourceGroupName, webAppName, siteEnvelope);
    return site;
  }
}
