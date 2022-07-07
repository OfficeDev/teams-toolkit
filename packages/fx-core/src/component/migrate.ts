import { Json } from "@microsoft/teamsfx-api";
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

export const EnvStateMigrationComponentNames = [
  ["solution", "solution"],
  ["fx-resource-appstudio", ComponentNames.AppManifest],
  ["fx-resource-identity", ComponentNames.Identity],
  ["fx-resource-azure-sql", ComponentNames.AzureSQL],
  ["fx-resource-aad-app-for-teams", ComponentNames.AadApp],
  ["fx-resource-function", ComponentNames.TeamsApi],
  ["fx-resource-apim", ComponentNames.APIM],
  ["fx-resource-key-vault", ComponentNames.KeyVault],
  ["fx-resource-bot", ComponentNames.TeamsBot],
  ["fx-resource-frontend-hosting", ComponentNames.TeamsTab],
];

/**
 * convert envState from V3 to V2
 */
export function convertEnvStateV3ToV2(envStateV3: Json): EnvStateV2 {
  const envStateV2: Json = {};
  const component2plugin = new Map<string, string>();
  EnvStateMigrationComponentNames.forEach((e) => {
    component2plugin.set(e[1], e[0]);
  });
  for (const componentName of Object.keys(envStateV3)) {
    const pluginName = component2plugin.get(componentName);
    if (pluginName) {
      envStateV2[pluginName] = envStateV3[componentName];
    }
  }
  return envStateV2 as EnvStateV2;
}

/**
 * convert envState from V2 to V3
 */
export function convertEnvStateV2ToV3(envStateV2: Json): Json {
  const envStateV3: Json = {};
  const plugin2component = new Map<string, string>();
  EnvStateMigrationComponentNames.forEach((e) => {
    plugin2component.set(e[0], e[1]);
  });
  for (const pluginName of Object.keys(envStateV2)) {
    const componentName = plugin2component.get(pluginName);
    if (componentName) {
      envStateV3[componentName] = envStateV2[pluginName];
    }
  }
  return envStateV3;
}
