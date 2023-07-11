// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as uuid from "uuid";
import axios from "axios";
import { PluginId, provisionParametersKey, StateConfigKey } from "./constants";
import {
  getKeyVaultSecretReference,
  getProvisionParameterValueByKey,
} from "../e2e/commonUtils";
import { CliHelper } from "./cliHelper";
const failedToParseResourceIdErrorMessage = (
  name: string,
  resourceId: string
) => `Failed to parse ${name} from resource id ${resourceId}`;

export function getResourceGroupNameFromResourceId(resourceId: string): string {
  const result = parseFromResourceId(
    /\/resourceGroups\/([^\/]*)\//i,
    resourceId
  );
  if (!result) {
    throw new Error(
      failedToParseResourceIdErrorMessage("resource group name", resourceId)
    );
  }
  return result;
}

export function getSubscriptionIdFromResourceId(resourceId: string): string {
  const result = parseFromResourceId(
    /\/subscriptions\/([^\/]*)\//i,
    resourceId
  );
  if (!result) {
    throw new Error(
      failedToParseResourceIdErrorMessage("subscription id", resourceId)
    );
  }
  return result;
}

export function getSiteNameFromResourceId(webAppResourceId: string): string {
  const result = parseFromResourceId(
    /providers\/Microsoft.Web\/sites\/([^\/]*)/i,
    webAppResourceId
  );
  if (!result) {
    throw new Error(
      failedToParseResourceIdErrorMessage("site name", webAppResourceId)
    );
  }
  return result;
}

export function getKeyVaultNameFromResourceId(
  keyVaultResourceId: string
): string {
  const result = parseFromResourceId(
    /providers\/Microsoft.KeyVault\/vaults\/([^\/]*)/i,
    keyVaultResourceId
  );
  if (!result) {
    throw new Error(
      failedToParseResourceIdErrorMessage("key vault name", keyVaultResourceId)
    );
  }
  return result;
}

export function getApimServiceNameFromResourceId(resourceId: string): string {
  const result = parseFromResourceId(
    /providers\/Microsoft.ApiManagement\/service\/([^\/]*)/i,
    resourceId
  );
  if (!result) {
    throw new Error(
      failedToParseResourceIdErrorMessage("apim service name", resourceId)
    );
  }
  return result;
}

export function getproductNameFromResourceId(resourceId: string): string {
  const result = parseFromResourceId(/products\/([^\/]*)/i, resourceId);
  if (!result) {
    throw new Error(
      failedToParseResourceIdErrorMessage("product name", resourceId)
    );
  }
  return result;
}

export function getAuthServiceNameFromResourceId(resourceId: string): string {
  const result = parseFromResourceId(
    /authorizationServers\/([^\/]*)/i,
    resourceId
  );
  if (!result) {
    throw new Error(
      failedToParseResourceIdErrorMessage("auth service name", resourceId)
    );
  }
  return result;
}

export function parseFromResourceId(
  pattern: RegExp,
  resourceId: string
): string {
  const result = resourceId.match(pattern);
  return result ? result[1].trim() : "";
}

export async function getWebappSettings(
  subscriptionId: string,
  rg: string,
  name: string,
  token: string
) {
  const baseUrlAppSettings = (
    subscriptionId: string,
    rg: string,
    name: string
  ) =>
    `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${rg}/providers/Microsoft.Web/sites/${name}/config/appsettings/list?api-version=2019-08-01`;

  try {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    const getResponse = await axios.post(
      baseUrlAppSettings(subscriptionId, rg, name)
    );
    if (getResponse && getResponse.data && getResponse.data.properties) {
      return getResponse.data.properties;
    }
  } catch (error) {
    console.log(error);
  }

  return undefined;
}

export async function getWebappConfigs(
  subscriptionId: string,
  rg: string,
  name: string,
  token: string
) {
  const baseUrlAppConfigs = (
    subscriptionId: string,
    rg: string,
    name: string
  ) =>
    `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${rg}/providers/Microsoft.Web/sites/${name}/config/web?api-version=2021-02-01`;

  try {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    const getResponse = await axios.get(
      baseUrlAppConfigs(subscriptionId, rg, name)
    );
    if (getResponse && getResponse.data && getResponse.data.properties) {
      return getResponse.data.properties;
    }
  } catch (error) {
    console.log(error);
  }

  return undefined;
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
    const planResponse = await runWithRetry(() =>
      axios.get(baseUrlPlan(subscriptionId, rg, name))
    );
    if (
      planResponse &&
      planResponse.data &&
      planResponse.data.sku &&
      planResponse.data.sku.name
    ) {
      return planResponse.data.sku.name;
    }
  } catch (error) {
    console.log(error);
  }

  return undefined;
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

export function getUuid(): string {
  return uuid.v4();
}

export function getExpectedM365ApplicationIdUri(
  ctx: any,
  activeResourcePlugins: string[]
): string {
  let expectedM365ApplicationIdUri = "";
  if (activeResourcePlugins.includes(PluginId.FrontendHosting)) {
    const tabDomain = ctx[PluginId.FrontendHosting][StateConfigKey.domain];
    const m365ClientId = ctx[PluginId.Aad][StateConfigKey.clientId];
    expectedM365ApplicationIdUri =
      `api://${tabDomain}/` +
      (activeResourcePlugins.includes(PluginId.Bot)
        ? `botid-${ctx[PluginId.Bot][StateConfigKey.botId]}`
        : `${m365ClientId}`);
  } else if (activeResourcePlugins.includes(PluginId.Bot)) {
    expectedM365ApplicationIdUri = `api://botid-${
      ctx[PluginId.Bot][StateConfigKey.botId]
    }`;
  }
  return expectedM365ApplicationIdUri;
}

export async function getExpectedM365ClientSecret(
  ctx: any,
  projectPath: string,
  env: string,
  activeResourcePlugins: string[]
): Promise<string> {
  let m365ClientSecret: string;
  if (activeResourcePlugins.includes(PluginId.KeyVault)) {
    const vaultName = getKeyVaultNameFromResourceId(
      ctx[PluginId.KeyVault][StateConfigKey.keyVaultResourceId]
    );
    const secretName =
      (await getProvisionParameterValueByKey(
        projectPath,
        env,
        provisionParametersKey.m365ClientSecretName
      )) ?? "m365ClientSecret";
    m365ClientSecret = getKeyVaultSecretReference(vaultName, secretName);
  } else {
    m365ClientSecret = await CliHelper.getUserSettings(
      `${PluginId.Aad}.${StateConfigKey.clientSecret}`,
      projectPath,
      env
    );
  }
  return m365ClientSecret;
}

export async function getExpectedBotClientSecret(
  ctx: any,
  projectPath: string,
  env: string,
  activeResourcePlugins: string[]
): Promise<string> {
  let botClientSecret: string;
  if (activeResourcePlugins.includes(PluginId.KeyVault)) {
    const vaultName = getKeyVaultNameFromResourceId(
      ctx[PluginId.KeyVault][StateConfigKey.keyVaultResourceId]
    );
    const secretName =
      (await getProvisionParameterValueByKey(
        projectPath,
        env,
        provisionParametersKey.botClientSecretName
      )) ?? "botClientSecret";
    botClientSecret = getKeyVaultSecretReference(vaultName, secretName);
  } else {
    botClientSecret = await CliHelper.getUserSettings(
      `${PluginId.Bot}.${StateConfigKey.botPassword}`,
      projectPath,
      env
    );
  }
  return botClientSecret;
}
