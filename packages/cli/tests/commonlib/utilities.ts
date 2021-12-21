// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import axios from "axios";

export function getResourceGroupNameFromResourceId(resourceId: string): string {
  const result = parseFromResourceId(/\/resourceGroups\/([^\/]*)\//i, resourceId);
  if (!result) {
    throw new Error(`Cannot parse resource group name from resource id ${resourceId}`);
  }
  return result;
}

export function getSubscriptionIdFromResourceId(resourceId: string): string {
  const result = parseFromResourceId(/\/subscriptions\/([^\/]*)\//i, resourceId);
  if (!result) {
    throw new Error(`Cannot parse subscription id from resource id ${resourceId}`);
  }
  return result;
}

export function getSiteNameFromResourceId(webAppResourceId: string): string {
  const result = parseFromResourceId(
    /providers\/Microsoft.Web\/sites\/([^\/]*)/i,
    webAppResourceId
  );
  if (!result) {
    throw new Error(`Cannot parse site name from resource id ${webAppResourceId}`);
  }
  return result;
}

export function parseFromResourceId(pattern: RegExp, resourceId: string): string {
  const result = resourceId.match(pattern);
  return result ? result[1].trim() : "";
}

export enum Capability {
  Tab = "tab",
  Bot = "bot",
  MessagingExtension = "messaging-extension",
}

export enum Resource {
  AzureFunction = "azure-function",
  AzureApim = "azure-apim",
  AzureSql = "azure-sql",
}

export async function getWebappConfigs(
  subscriptionId: string,
  rg: string,
  name: string,
  token: string
) {
  const baseUrlAppSettings = (subscriptionId: string, rg: string, name: string) =>
    `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${rg}/providers/Microsoft.Web/sites/${name}/config/appsettings/list?api-version=2019-08-01`;

  try {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    const getResponse = await axios.post(baseUrlAppSettings(subscriptionId, rg, name));
    if (!getResponse || !getResponse.data || !getResponse.data.properties) {
      return undefined;
    }

    return getResponse.data.properties;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

export async function getWebappServicePlan(
  subscriptionId: string,
  rg: string,
  name: string,
  token: string
) {
  const baseUrlPlan = (subscriptionId: string, rg: string, name: string) =>
    `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${rg}/providers/Microsoft.Web/serverfarms/${name}?api-version=2019-08-01`;

  try {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    const planResponse = await this.runWithRetry(() =>
      axios.get(baseUrlPlan(subscriptionId, rg, name))
    );
    if (
      !planResponse ||
      !planResponse.data ||
      !planResponse.data.sku ||
      !planResponse.data.sku.name
    ) {
      return undefined;
    }

    return planResponse.data.sku.name;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}
