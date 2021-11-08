// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Site } from "@azure/arm-appservice/esm/models/mappers";
import { WebSiteManagementClient, WebSiteManagementModels } from "@azure/arm-appservice";

import { AzureInfo, Constants, DefaultProvisionConfigs, RegularExpr } from "../constants";
import { AzureLib } from "../utils/azure-client";
import { ProvisionError, runWithErrorCatchAndWrap } from "../resources/errors";
import { ResourceType } from "../enum";

type Site = WebSiteManagementModels.Site;

function normalize(raw: string): string {
  return raw.replace(RegularExpr.allCharToBeSkippedInName, Constants.emptyString).toLowerCase();
}

function concatName(appName: string, mergedSuffix: string): string {
  const suffix = normalize(mergedSuffix).substr(0, AzureInfo.suffixLenMax);
  const paddingLength = AzureInfo.webappNameLenMax - suffix.length;
  const normalizedAppName = normalize(appName).substr(0, paddingLength);
  return normalizedAppName + suffix;
}

export function generateWebAppName(
  appName: string,
  classSuffix: string,
  identSuffix: string
): string {
  const mergedSuffix: string = classSuffix + identSuffix;
  return concatName(appName, mergedSuffix);
}

export async function ensureWebApp(
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

  const site = await runWithErrorCatchAndWrap(
    (error) => new ProvisionError(ResourceType.webApp, error.code),
    async () => await AzureLib.ensureWebApp(client, resourceGroupName, webAppName, siteEnvelope)
  );

  if (!site.defaultHostName) {
    // TODO: Logger.error("failToGetWebAppEndpoint");
    throw new ProvisionError(ResourceType.webApp);
  }

  return site;
}

export async function ensureAppServicePlan(
  client: WebSiteManagementClient,
  resourceGroupName: string,
  appServicePlanName: string,
  location: string
) {
  const appServicePlan = await runWithErrorCatchAndWrap(
    (error) => new ProvisionError(ResourceType.appServicePlan, error.code),
    async () =>
      await AzureLib.ensureAppServicePlan(
        client,
        resourceGroupName,
        appServicePlanName,
        DefaultProvisionConfigs.appServicePlansConfig(location)
      )
  );

  const appServicePlanId: string | undefined = appServicePlan.id;
  if (!appServicePlanId) {
    // TODO: Logger.error("failToGetAppServicePlanId");
    throw new ProvisionError(ResourceType.appServicePlan);
  }

  return appServicePlanId;
}
