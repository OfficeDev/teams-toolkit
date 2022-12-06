// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, FxError, Inputs, ok, Result, SystemError } from "@microsoft/teamsfx-api";
import path from "path";
import { isAadManifestEnabled } from "../../common/tools";
import { CoreHookContext } from "../types";
import fs from "fs-extra";
import { getLocalizedString } from "../../common/localizeUtils";
import { TOOLS } from "../globalVars";
import { generateAadManifestTemplate } from "../generateAadManifestTemplate";
import { PluginNames } from "../../component/constants";
import { RequiredResourceAccess } from "../../component/resource/aadApp/interfaces/AADManifest";
import { CoreSource } from "../error";

export interface Permission {
  resource: string;
  delegated: string[];
  application: string[];
}

export function permissionsToRequiredResourceAccess(
  permissions: Permission[]
): RequiredResourceAccess[] | undefined {
  const result: RequiredResourceAccess[] = [];
  try {
    permissions.forEach((permission) => {
      const res: RequiredResourceAccess = {
        resourceAppId: permission.resource,
        resourceAccess: permission.application
          .map((item) => {
            return { id: item, type: "Role" };
          })
          .concat(
            permission.delegated.map((item) => {
              return { id: item, type: "Scope" };
            })
          ),
      };
      result.push(res);
    });
  } catch (err) {
    return undefined;
  }

  return result;
}

export async function generateAadManifest(
  projectPath: string,
  projectSettingsJson: any
): Promise<void> {
  const permissionFilePath = path.join(projectPath, "permissions.json");

  // add aad.template.file
  const permissions = (await fs.readJson(permissionFilePath)) as Permission[];

  const requiredResourceAccess = permissionsToRequiredResourceAccess(permissions);
  if (!requiredResourceAccess) {
    TOOLS?.logProvider.warning(
      getLocalizedString("core.aadManifestMigration.ParsePermissionsFailedWarning")
    );
  }

  await generateAadManifestTemplate(projectPath, projectSettingsJson, requiredResourceAccess, true);
}

export async function needMigrateToAadManifest(ctx: CoreHookContext): Promise<boolean> {
  try {
    if (!isAadManifestEnabled()) {
      return false;
    }

    const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
    if (!inputs.projectPath) {
      return false;
    }
    const fxExist = await fs.pathExists(path.join(inputs.projectPath as string, ".fx"));
    if (!fxExist) {
      return false;
    }

    const aadManifestTemplateExist = await fs.pathExists(
      path.join(inputs.projectPath as string, "templates", "appPackage", "aad.template.json")
    );

    if (aadManifestTemplateExist) {
      return false;
    }

    const permissionFileExist = await fs.pathExists(
      path.join(inputs.projectPath as string, "permissions.json")
    );

    if (!permissionFileExist) {
      return false;
    }

    const projectSettingsJson = await fs.readJson(
      path.join(inputs.projectPath as string, ".fx", "configs", "projectSettings.json")
    );
    const aadPluginIsActive = projectSettingsJson.solutionSettings?.activeResourcePlugins?.includes(
      PluginNames.AAD
    );

    if (!aadPluginIsActive) {
      return false;
    }

    return true;
  } catch (err) {
    return false;
  }
}

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
};
export const provisionOutputNamingsV3: string[] = [
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
  "state.fx-resource-bot.appServicePlanName",
  "state.fx-resource-bot.resourceId",
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
export const pluginIdMappingV3: { [key: string]: string } = {
  "fx-resource-frontend-hosting": "teams-tab",
  "fx-resource-function": "teams-api",
  "fx-resource-identity": "identity",
  "fx-resource-bot": "teams-bot",
  "fx-resource-key-vault": "key-vault",
  "fx-resource-azure-sql": "azure-sql",
  "fx-resource-apim": "apim",
};
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
  bicepContent: string
): Result<string, FxError> {
  try {
    if (Object.keys(fixedNamingsV3).includes(name)) {
      return ok(fixedNamingsV3[name]);
    } else if (
      provisionOutputNamingsV3.some((element, index, array) => {
        // for sql, may have key like: state.fx-resource-azure-sql.databaseName_xxx
        return name.startsWith(element);
      })
    ) {
      const res = provisionOutputNamingConverterV3(name, bicepContent);
      return ok(res);
    } else {
      const res = commonNamingConverterV3(name);
      switch (type) {
        case FileType.CONFIG:
          return ok(`${configPrefix}${res}`);
        case FileType.USERDATA:
          return ok(`${secretPrefix}${res}`);
        case FileType.STATE:
        default:
          return ok(res);
      }
    }
  } catch (error: any) {
    return err(new SystemError(CoreSource, "FailedToConvertV2ConfigNameToV3", error?.message));
  }
}

// convert x-xx.xxx.xxx to x_xx__xxx__xxx
function commonNamingConverterV3(name: string): string {
  const names = name.split(".");
  return names.join("__").replace(/\-/g, "_").toUpperCase();
}

function provisionOutputNamingConverterV3(name: string, bicepContent: string): string {
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
    throw new Error(`Failed to find matching output in provision.bicep for key ${name}`);
  }

  return `${provisionOutputPrefix}${outputName}__${keyName}`.toUpperCase();
}

export function replacePlaceholdersForV3(content: string, bicepContent: string): string {
  const placeholderRegex = /{{+ *[a-zA-Z_.-][a-zA-Z0-9_.-]* *}}+/g;
  const placeholders = content.match(placeholderRegex);

  if (placeholders) {
    for (const placeholder of placeholders) {
      const envNameV2 = placeholder.replace(/\{/g, "").replace(/\}/g, "");
      const envNameV3 = namingConverterV3(envNameV2, FileType.STATE, bicepContent);
      if (envNameV3.isOk()) {
        content = content.replace(placeholder, `$\{\{${envNameV3.value}\}\}`);
      } else {
        throw envNameV3.error;
      }
    }
  }

  return content;
}
