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

export async function getWebappSettings(
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

export async function getWebappConfigs(
  subscriptionId: string,
  rg: string,
  name: string,
  token: string
) {
  const baseUrlAppConfigs = (subscriptionId: string, rg: string, name: string) =>
    `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${rg}/providers/Microsoft.Web/sites/${name}/config/web?api-version=2021-02-01`;

  try {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    const getResponse = await axios.get(baseUrlAppConfigs(subscriptionId, rg, name));
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
    const planResponse = await runWithRetry(() => axios.get(baseUrlPlan(subscriptionId, rg, name)));
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

export async function runWithRetry<T>(fn: () => Promise<T>) {
  const maxTryCount = 3;
  const defaultRetryAfterInSecond = 2;
  const maxRetryAfterInSecond = 3 * 60;
  const secondInMilliseconds = 1000;

  for (let i = 0; i < maxTryCount - 1; i++) {
    try {
      const ret = await fn();
      return ret;
    } catch (e) {
      let retryAfterInSecond = defaultRetryAfterInSecond;
      if (e.response?.status === 429) {
        // See https://docs.microsoft.com/en-us/azure/azure-resource-manager/management/request-limits-and-throttling#error-code.
        const suggestedRetryAfter = e.response?.headers?.["retry-after"];
        // Explicit check, _retryAfter can be 0.
        if (suggestedRetryAfter !== undefined) {
          if (suggestedRetryAfter > maxRetryAfterInSecond) {
            // Don't wait too long.
            throw e;
          } else {
            // Take one more second for time error.
            retryAfterInSecond = suggestedRetryAfter + 1;
          }
        }
      }
      await new Promise((resolve) =>
        setTimeout(resolve, retryAfterInSecond * secondInMilliseconds)
      );
    }
  }

  return fn();
}
