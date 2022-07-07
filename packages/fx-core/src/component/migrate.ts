import {
  AzureSolutionSettings,
  Json,
  ProjectSettings,
  ProjectSettingsV3,
} from "@microsoft/teamsfx-api";
import { cloneDeep } from "lodash";
import { isVSProject } from "../common/projectSettingsHelper";
import { ComponentNames } from "./constants";
import { getComponent } from "./workflow";

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

export function convertProjectSettingsV2ToV3(settingsV2: ProjectSettings) {
  const settingsV3 = cloneDeep(settingsV2) as ProjectSettingsV3;
  settingsV3.components = [];
  const solutionSettings = settingsV2.solutionSettings as AzureSolutionSettings;
  if (solutionSettings) {
    const isVS = isVSProject(settingsV2);
    if (solutionSettings.activeResourcePlugins.includes("fx-resource-frontend-hosting")) {
      const hostingComponent = isVS ? ComponentNames.AzureWebApp : ComponentNames.AzureStorage;
      if (isVS) {
        const teamsTab: any = {
          hosting: hostingComponent,
          name: "teams-tab",
          build: true,
          provision: false,
          folder: "",
          artifactFolder: "bin\\Release\\net6.0\\win-x86\\publish",
        };
        settingsV3.components.push(teamsTab);
      } else {
        const teamsTab: any = {
          hosting: hostingComponent,
          name: "teams-tab",
          build: true,
          provision: true,
          folder: "tabs",
        };
        settingsV3.components.push(teamsTab);
      }
      const hostingConfig = getComponent(settingsV3, hostingComponent);
      if (hostingConfig) {
        hostingConfig.connections = hostingConfig.connections || [];
        hostingConfig.connections.push("teams-tab");
      } else {
        settingsV3.components.push({
          name: hostingComponent,
          connections: ["teams-tab"],
          provision: true,
        });
      }
    }
    if (solutionSettings.activeResourcePlugins.includes("fx-resource-bot")) {
      const hostType = settingsV2.pluginSettings?.["fx-resource-bot"]?.["host-type"];
      const isHostingFunction = hostType === "azure-functions";
      const hostingComponent = isHostingFunction
        ? ComponentNames.Function
        : ComponentNames.AzureWebApp;
      if (isVS) {
        const teamsBot: any = {
          name: "teams-bot",
          hosting: hostingComponent,
          build: true,
          folder: "",
          artifactFolder: "bin\\Release\\net6.0\\win-x86\\publish",
        };
        settingsV3.components.push(teamsBot);
      } else {
        const teamsBot: any = {
          hosting: hostingComponent,
          name: "teams-bot",
          build: true,
          provision: true,
          folder: "bot",
        };
        settingsV3.components.push(teamsBot);
      }
      const hostingConfig = getComponent(settingsV3, hostingComponent);
      if (hostingConfig) {
        hostingConfig.connections = hostingConfig.connections || [];
        hostingConfig.connections.push("teams-bot");
      } else {
        settingsV3.components.push({
          name: hostingComponent,
          connections: ["teams-bot"],
          provision: true,
        });
      }
      settingsV3.components.push({
        name: hostingComponent,
        connections: ["bot-service"],
        provision: true,
      });
    }
    if (solutionSettings.activeResourcePlugins.includes("fx-resource-identity")) {
      settingsV3.components.push({
        name: ComponentNames.Identity,
      });
    }
    if (solutionSettings.activeResourcePlugins.includes("fx-resource-key-vault")) {
      settingsV3.components.push({
        name: ComponentNames.KeyVault,
      });
    }
    if (solutionSettings.activeResourcePlugins.includes("fx-resource-azure-sql")) {
      settingsV3.components.push({
        name: ComponentNames.AzureSQL,
        provision: true,
      });
    }
    if (solutionSettings.activeResourcePlugins.includes("fx-resource-function")) {
      settingsV3.components.push({
        name: ComponentNames.TeamsApi,
        hosting: ComponentNames.Function,
        functionNames: ["getUserProfile"],
        build: true,
        folder: "api",
      });
      settingsV3.components.push({
        name: ComponentNames.Function,
      });
    }
    connectComponents(settingsV3);
  }
  return settingsV3;
}

function connectResourceToComponent(
  computeComponent: string,
  resource: string,
  settingsV3: ProjectSettingsV3
) {
  const hostingConfig = getComponent(settingsV3, computeComponent);
  if (hostingConfig) {
    hostingConfig.connections = hostingConfig.connections || [];
    if (hostingConfig.connections.includes(resource)) hostingConfig.connections.push(resource);
  }
}

function connectComponents(settingsV3: ProjectSettingsV3) {
  const resources = [
    ComponentNames.Identity,
    ComponentNames.AzureSQL,
    ComponentNames.KeyVault,
    ComponentNames.TeamsTab,
    ComponentNames.TeamsBot,
  ];
  const computingComponentNames = [ComponentNames.AzureWebApp, ComponentNames.Function];
  for (const computingComponentName of computingComponentNames) {
    const component = getComponent(settingsV3, computingComponentName);
    if (component) {
      for (const resource of resources) {
        if (getComponent(settingsV3, resource)) {
          connectResourceToComponent(computingComponentName, resource, settingsV3);
        }
      }
    }
  }
}

export function convertProjectSettingsV3ToV2(settingsV3: ProjectSettingsV3) {
  return settingsV3;
}
