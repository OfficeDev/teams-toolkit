// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, FxError, ok, Result, SystemError } from "@microsoft/teamsfx-api";
import { CoreSource } from "../../../error";

export enum FileType {
  STATE,
  CONFIG,
  USERDATA,
}
export const fixedNamingsV3: { [key: string]: string } = {
  "state.solution.subscriptionId": "AZURE_SUBSCRIPTION_ID",
  "state.solution.resourceGroupName": "AZURE_RESOURCE_GROUP_NAME",
  "state.solution.resourceNameSuffix": "RESOURCE_SUFFIX",
  "state.fx-resource-appstudio.tenantId": "TEAMS_APP_TENANT_ID",
  "state.fx-resource-appstudio.teamsAppId": "TEAMS_APP_ID",
  "state.fx-resource-aad-app-for-teams.clientId": "AAD_APP_CLIENT_ID",
  "state.fx-resource-aad-app-for-teams.clientSecret": "SECRET_AAD_APP_CLIENT_SECRET",
  "state.fx-resource-aad-app-for-teams.objectId": "AAD_APP_OBJECT_ID",
  "state.fx-resource-aad-app-for-teams.oauth2PermissionScopeId":
    "AAD_APP_ACCESS_AS_USER_PERMISSION_ID",
  "state.fx-resource-aad-app-for-teams.tenantId": "AAD_APP_TENANT_ID",
  "state.fx-resource-aad-app-for-teams.oauthHost": "AAD_APP_OAUTH_AUTHORITY_HOST",
  "state.fx-resource-aad-app-for-teams.oauthAuthority": "AAD_APP_OAUTH_AUTHORITY",
  "state.fx-resource-bot.botId": "BOT_ID",
  "state.fx-resource-bot.botPassword": "SECRET_BOT_PASSWORD",
  "state.fx-resource-frontend-hosting.sslCertFile": "SSL_CRT_FILE",
  "state.fx-resource-frontend-hosting.sslKeyFile": "SSL_KEY_FILE",
  "state.fx-resource-apim.publisherEmail": "APIM__PUBLISHEREMAIL",
  "state.fx-resource-apim.publisherName": "APIM__PUBLISHERNAME",
};
const provisionOutputNamingsV3: string[] = [
  "state.fx-resource-frontend-hosting.indexPath",
  "state.fx-resource-frontend-hosting.domain",
  "state.fx-resource-frontend-hosting.endpoint",
  "state.fx-resource-frontend-hosting.storageResourceId",
  "state.fx-resource-frontend-hosting.resourceId",
  "state.fx-resource-azure-sql.sqlResourceId",
  "state.fx-resource-azure-sql.sqlEndpoint",
  "state.fx-resource-azure-sql.databaseName",
  "state.fx-resource-apim.productResourceId",
  "state.fx-resource-apim.serviceResourceId",
  "state.fx-resource-apim.authServerResourceId",
  "state.fx-resource-bot.skuName",
  "state.fx-resource-bot.siteName",
  "state.fx-resource-bot.domain",
  "state.fx-resource-bot.validDomain",
  "state.fx-resource-bot.appServicePlanName",
  "state.fx-resource-bot.resourceId",
  "state.fx-resource-bot.functionAppResourceId",
  "state.fx-resource-bot.webAppResourceId",
  "state.fx-resource-bot.botWebAppResourceId",
  "state.fx-resource-bot.siteEndpoint",
  "state.fx-resource-identity.identityName",
  "state.fx-resource-identity.identityResourceId",
  "state.fx-resource-identity.identityClientId",
  "state.fx-resource-function.sku",
  "state.fx-resource-function.appName",
  "state.fx-resource-function.domain",
  "state.fx-resource-function.appServicePlanName",
  "state.fx-resource-function.functionAppResourceId",
  "state.fx-resource-function.functionEndpoint",
  "state.fx-resource-key-vault.m365ClientSecretReference",
  "state.fx-resource-key-vault.botClientSecretReference",
];
const nameMappingV3: { [key: string]: string } = {
  "state.fx-resource-aad-app-for-teams.botEndpoint": "state.fx-resource-bot.siteEndpoint",
  "state.fx-resource-aad-app-for-teams.frontendEndpoint":
    "state.fx-resource-frontend-hosting.endpoint",
};
const pluginIdMappingV3: { [key: string]: string } = {
  "fx-resource-frontend-hosting": "teams-tab",
  "fx-resource-function": "teams-api",
  "fx-resource-identity": "identity",
  "fx-resource-bot": "teams-bot",
  "fx-resource-key-vault": "key-vault",
  "fx-resource-azure-sql": "azure-sql",
  "fx-resource-apim": "apim",
  "fx-resource-aad-app-for-teams": "aad-app",
  "fx-resource-appstudio": "app-manifest",
  "fx-resource-simple-auth": "simple-auth",
};
const secretKeys = [
  "state.fx-resource-aad-app-for-teams.clientSecret",
  "state.fx-resource-bot.botPassword",
  "state.fx-resource-apim.apimClientAADClientSecret",
  "state.fx-resource-azure-sql.adminPassword",
];
const secretPrefix = "SECRET_";
const configPrefix = "CONFIG__";
const provisionOutputPrefix = "PROVISIONOUTPUT__";

function generateOutputNameRegexForPlugin(pluginId: string) {
  return new RegExp(
    "output +(\\S+) +object += +{" + // Mataches start of output declaration and capture output name. Example: output functionOutput object = {
      "[^{]*" + // Matches everything between '{' and plugin id declaration. For example: comments, extra properties. Will match multilines.
      `teamsFxPluginId: +\'${pluginId}\'`, // Matches given plugin id declaration
    "g"
  );
}

export function namingConverterV3(
  name: string,
  type: FileType,
  bicepContent: string,
  needsRename = false
): Result<string, FxError> {
  try {
    // Convert state.aad-app.clientId to state.fx-resource-aad-app-for-teams.clientId
    name = convertPluginId(name);

    // Needs to map certain values only when migrating manifest
    if (needsRename && Object.keys(nameMappingV3).includes(name)) {
      name = nameMappingV3[name];
    }
    if (Object.keys(fixedNamingsV3).includes(name)) {
      return ok(fixedNamingsV3[name]);
    } else if (
      provisionOutputNamingsV3.some((element, index, array) => {
        // for sql, may have key like: state.fx-resource-azure-sql.databaseName_xxx
        return name.startsWith(element);
      }) &&
      bicepContent
    ) {
      return ok(provisionOutputNamingConverterV3(name, bicepContent, type));
    } else {
      return ok(commonNamingConverterV3(name, type));
    }
  } catch (error: any) {
    return err(new SystemError(CoreSource, "FailedToConvertV2ConfigNameToV3", error?.message));
  }
}

// convert x-xx.xxx.xxx to x_xx__xxx__xxx
function commonNamingConverterV3(name: string, type: FileType): string {
  const names = name.split(".");
  const res = names.join("__").replace(/\-/g, "_").toUpperCase();
  switch (type) {
    case FileType.CONFIG:
      return `${configPrefix}${res}`;
    case FileType.USERDATA:
      if (res.startsWith("STATE__"))
        return `${secretPrefix}${res.substring(res.indexOf("STATE__") + 7)}`;
      else return `${secretPrefix}${res}`;
    case FileType.STATE:
    default:
      return res;
  }
}

function provisionOutputNamingConverterV3(
  name: string,
  bicepContent: string,
  type: FileType
): string {
  const names = name.split(".");
  const pluginNames = [names[1], pluginIdMappingV3[names[1]]];
  const keyName = names[2];

  let outputName = "";

  for (const pluginName of pluginNames) {
    const pluginRegex = generateOutputNameRegexForPlugin(pluginName);
    let outputNames = pluginRegex.exec(bicepContent);
    if (outputNames !== null) {
      // if have multiple sql database
      if (
        "fx-resource-azure-sql" === pluginNames[0] &&
        keyName.startsWith("databaseName") &&
        keyName.includes("_")
      ) {
        // database name may be: databaseName_xxxxxx
        const suffix = keyName.split("_")[1];
        do {
          if (
            outputNames &&
            outputNames[1] &&
            outputNames[1].includes("_") &&
            suffix === outputNames[1].split("_")[1]
          ) {
            outputName = outputNames[1];
            break;
          }
        } while ((outputNames = pluginRegex.exec(bicepContent)));
      } else {
        outputName = outputNames[1];
      }

      if (outputName) {
        break;
      }
    }
  }

  if (!outputName) {
    return commonNamingConverterV3(name, type);
  }

  return `${provisionOutputPrefix}${outputName}__${keyName}`.toUpperCase();
}

export function convertPluginId(name: string): string {
  const nameArray = name.split(".");
  if (!nameArray || nameArray.length <= 1) {
    return name;
  }
  const pluginId = nameArray[1];
  if (Object.values(pluginIdMappingV3).includes(pluginId)) {
    const convertedPluginId = Object.keys(pluginIdMappingV3).find(
      (key) => pluginIdMappingV3[key] === pluginId
    );
    name = name.replace(pluginId, convertedPluginId!);
  }
  return name;
}

export function replacePlaceholdersForV3(content: string, bicepContent: string): string {
  const placeholderRegex = /{{+ *[a-zA-Z_.-][a-zA-Z0-9_.-]* *}}+/g;
  const placeholders = content.match(placeholderRegex);

  if (placeholders) {
    for (const placeholder of placeholders) {
      const envNameV2 = placeholder.replace(/\{/g, "").replace(/\}/g, "");
      const envNameV3 = namingConverterV3(
        envNameV2,
        secretKeys.includes(convertPluginId(envNameV2)) ? FileType.USERDATA : FileType.STATE,
        bicepContent,
        true
      );
      if (envNameV3.isOk()) {
        content = content.replace(placeholder, `$\{\{${envNameV3.value}\}\}`);
      } else {
        throw envNameV3.error;
      }
    }
  }

  return content;
}
