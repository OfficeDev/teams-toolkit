import { Json, ProjectSettingsV3 } from "@microsoft/teamsfx-api";
import { ComponentNames } from "./constants";

export interface EnvStateV2 {
  solution: {
    teamsAppTenantId?: string;
    subscriptionId?: string;
    subscriptionName?: string;
    tenantId?: string;
    needCreateResourceGroup?: boolean;
    resourceGroupName?: string;
    location?: string;
    resourceNameSuffix?: string;
    provisionSucceeded?: boolean;
  };
  "fx-resource-appstudio"?: {
    tenantId?: string;
    teamsAppId?: string;
    teamsAppUpdatedAt?: number;
  };
  "fx-resource-identity"?: {
    identityName?: string;
    identityResourceId?: string;
    identityClientId?: string;
  };
  "fx-resource-azure-sql"?: {
    admin?: string;
    adminPassword?: string;
    sqlResourceId?: string;
    sqlEndpoint?: string;
    databaseName?: string;
  };
  "fx-resource-bot"?: {
    botId?: string;
    botPassword?: string;
    objectId?: string;
    skuName?: string;
    siteName?: string;
    validDomain?: string;
    appServicePlanName?: string;
    resourceId?: string;
    siteEndpoint?: string;
  };
  "fx-resource-aad-app-for-teams"?: {
    clientId?: string;
    clientSecret?: string;
    objectId?: string;
    oauth2PermissionScopeId?: string;
    tenantId?: string;
    oauthHost?: string;
    oauthAuthority?: string;
    applicationIdUris?: string;
    botId?: string;
    botEndpoint?: string;
    frontendEndpoint?: string;
  };
  "fx-resource-function"?: {
    functionAppResourceId?: string;
    functionEndpoint?: string;
  };
  "fx-resource-apim"?: {
    apimClientAADObjectId?: string;
    apimClientAADClientId?: string;
    apimClientAADClientSecret?: string;
    serviceResourceId?: string;
    productResourceId?: string;
    authServerResourceId?: string;
  };
  "fx-resource-frontend-hosting"?: {
    domain?: string;
    endpoint?: string;
    indexPath?: string;
    storageResourceId?: string;
  };
  "fx-resource-key-vault"?: {
    keyVaultResourceId?: string;
    m365ClientSecretReference?: string;
    botClientSecretReference?: string;
  };
}

/**
 * do after secret fields replaced
 */
export function migrateEnvStateToV2(settings: ProjectSettingsV3, envStateV3: Json) {
  const envStateV2: EnvStateV2 = { solution: {} };
  for (const key of Object.keys(envStateV3)) {
    if (key === "solution") {
      envStateV2[key] = envStateV3[key];
    } else if (key === ComponentNames.AppManifest) {
      envStateV2["fx-resource-appstudio"] = envStateV3[key];
    } else if (key === ComponentNames.Identity) {
      envStateV2["fx-resource-identity"] = envStateV3[key];
    } else if (key === ComponentNames.AzureSQL) {
      envStateV2["fx-resource-azure-sql"] = envStateV3[key];
    } else if (key === ComponentNames.AadApp) {
      envStateV2["fx-resource-aad-app-for-teams"] = envStateV3[key];
    } else if (key === ComponentNames.Function) {
      envStateV2["fx-resource-function"] = envStateV2["fx-resource-function"] || {};
      envStateV2["fx-resource-function"].functionAppResourceId =
        envStateV3[ComponentNames.Function].resourceId;
      envStateV2["fx-resource-function"].functionEndpoint =
        envStateV3[ComponentNames.Function].endpoint;
    } else if (key === ComponentNames.APIM) {
      envStateV2["fx-resource-apim"] = envStateV3[key];
    } else if (key === ComponentNames.KeyVault) {
      envStateV2["fx-resource-key-vault"] = envStateV3[key];
    } else if (key === ComponentNames.AzureWebApp) {
      const components = settings.components.filter(
        (c) => c.hosting === ComponentNames.AzureWebApp
      );
      if (components.length > 0) {
        const component = components[0];
        if (component.name === ComponentNames.TeamsBot) {
          // web app for bot
          envStateV2["fx-resource-bot"] = envStateV2["fx-resource-bot"] || {};
          envStateV2["fx-resource-bot"].botId = envStateV3[ComponentNames.BotService].botId;
          envStateV2["fx-resource-bot"].botPassword =
            envStateV3[ComponentNames.BotService].botPassword;
          envStateV2["fx-resource-bot"].objectId = envStateV3[ComponentNames.BotService].objectId;
          envStateV2["fx-resource-bot"].skuName = envStateV3[ComponentNames.AzureWebApp].skuName;
          envStateV2["fx-resource-bot"].siteName = envStateV3[ComponentNames.AzureWebApp].siteName;
          envStateV2["fx-resource-bot"].validDomain =
            envStateV3[ComponentNames.AzureWebApp].validDomain;
          envStateV2["fx-resource-bot"].appServicePlanName =
            envStateV3[ComponentNames.AzureWebApp].appServicePlanName;
          envStateV2["fx-resource-bot"].resourceId =
            envStateV3[ComponentNames.AzureWebApp].resourceId;
          envStateV2["fx-resource-bot"].siteEndpoint =
            envStateV3[ComponentNames.AzureWebApp].endpoint;
        } else {
          //  web app for tab
        }
      }
    } else if (key === ComponentNames.AzureStorage) {
      const components = settings.components.filter(
        (c) => c.hosting === ComponentNames.AzureStorage
      );
      if (components.length > 0) {
        const component = components[0];
        if (component.name === ComponentNames.TeamsTab) {
          envStateV2["fx-resource-frontend-hosting"] =
            envStateV2["fx-resource-frontend-hosting"] || {};
          envStateV2["fx-resource-frontend-hosting"].domain =
            envStateV3[ComponentNames.AzureStorage].domain;
          envStateV2["fx-resource-frontend-hosting"].endpoint =
            envStateV3[ComponentNames.AzureStorage].endpoint;
          envStateV2["fx-resource-frontend-hosting"].indexPath =
            envStateV3[ComponentNames.AzureStorage].indexPath;
          envStateV2["fx-resource-frontend-hosting"].storageResourceId =
            envStateV3[ComponentNames.AzureStorage].resourceId;
        }
      }
    }
  }
}
