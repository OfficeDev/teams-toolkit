import { pathExistsSync } from "fs-extra";
import { cloneDeep } from "lodash";
import { join } from "path";
import { isVSProject } from "../common/projectSettingsHelper";
import { CapabilityOptions } from "../question/create";
import { ComponentNames } from "./constants";
import { ensureComponentConnections } from "./utils";
import { getComponent } from "./workflow";

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
  ["fx-resource-simple-auth", ComponentNames.SimpleAuth],
];

export function convertProjectSettingsV2ToV3(settingsV2: any, projectPath: string): any {
  const settingsV3 = cloneDeep(settingsV2) as any;
  const solutionSettings = settingsV2.solutionSettings as any;
  if (solutionSettings && (!settingsV3.components || settingsV3.components.length === 0)) {
    settingsV3.components = [];
    const isVS = isVSProject(settingsV2);
    const hasAAD = solutionSettings.activeResourcePlugins.includes("fx-resource-aad-app-for-teams");
    if (hasAAD) {
      settingsV3.components.push({
        name: ComponentNames.AadApp,
        provision: true,
        deploy: true,
      });
    }
    if (solutionSettings.activeResourcePlugins.includes("fx-resource-frontend-hosting")) {
      const hostingComponent = isVS ? ComponentNames.AzureWebApp : ComponentNames.AzureStorage;
      const existsAuthStartFile = pathExistsSync(
        join(projectPath, "tabs", "public", "auth-start.html")
      );
      const tabSSO =
        solutionSettings.capabilities.includes("TabSSO") ||
        solutionSettings.capabilities.includes("SSO") ||
        existsAuthStartFile;
      if (isVS) {
        const teamsTab: any = {
          hosting: hostingComponent,
          name: "teams-tab",
          build: true,
          provision: true,
          folder: "",
          artifactFolder: "bin\\Release\\net6.0\\win-x86\\publish",
          sso: tabSSO,
          deploy: true,
        };
        settingsV3.components.push(teamsTab);
      } else {
        const teamsTab: any = {
          hosting: hostingComponent,
          name: "teams-tab",
          build: true,
          provision: true,
          folder: "tabs",
          sso: tabSSO,
          deploy: true,
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
    if (solutionSettings.activeResourcePlugins.includes("fx-resource-spfx")) {
      const teamsTab: any = {
        hosting: "spfx",
        name: "teams-tab",
        build: true,
        provision: true,
        folder: "SPFx",
        deploy: true,
      };
      settingsV3.components.push(teamsTab);
      settingsV3.components.push({
        name: "spfx",
        provision: true,
      });
    }
    if (solutionSettings.activeResourcePlugins.includes("fx-resource-bot")) {
      const hostType = settingsV2.pluginSettings?.["fx-resource-bot"]?.["host-type"];
      let botCapabilities = settingsV2.pluginSettings?.["fx-resource-bot"]?.["capabilities"];
      if (
        solutionSettings.capabilities.includes(CapabilityOptions.me().id) &&
        !botCapabilities?.includes("message-extension")
      ) {
        botCapabilities = botCapabilities || [];
        botCapabilities.push("message-extension");
      }
      const isHostingFunction = hostType === "azure-functions";
      const hostingComponent = isHostingFunction
        ? ComponentNames.Function
        : ComponentNames.AzureWebApp;
      if (isVS) {
        const teamsBot: any = {
          name: "teams-bot",
          hosting: hostingComponent,
          build: true,
          provision: true,
          folder: "",
          artifactFolder: "bin\\Release\\net6.0\\win-x86\\publish",
          capabilities: botCapabilities,
          sso: solutionSettings.capabilities.includes("BotSSO"),
          deploy: true,
        };
        settingsV3.components.push(teamsBot);
      } else {
        const teamsBot: any = {
          hosting: hostingComponent,
          name: "teams-bot",
          build: true,
          provision: true,
          folder: "bot",
          capabilities: botCapabilities,
          sso: solutionSettings.capabilities.includes("BotSSO"),
          deploy: true,
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
          scenario: "Bot",
        });
      }
      settingsV3.components.push({
        name: ComponentNames.BotService,
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
    if (solutionSettings.activeResourcePlugins.includes("fx-resource-apim")) {
      settingsV3.components.push({
        name: ComponentNames.APIM,
        provision: true,
        deploy: true,
      });
    }
    if (solutionSettings.activeResourcePlugins.includes("fx-resource-simple-auth")) {
      settingsV3.components.push({
        name: ComponentNames.SimpleAuth,
        provision: true,
      });
    }
    if (solutionSettings.activeResourcePlugins.includes("fx-resource-function")) {
      settingsV3.components.push({
        name: ComponentNames.TeamsApi,
        hosting: ComponentNames.Function,
        functionNames: [settingsV2.defaultFunctionName || "getUserProfile"],
        build: true,
        folder: "api",
        deploy: true,
        artifactFolder: "api",
      });
      settingsV3.components.push({
        name: ComponentNames.Function,
        scenario: "Api",
      });
    }

    ensureComponentConnections(settingsV3);
  }
  return settingsV3;
}

export function convertManifestTemplateToV3(content: string): string {
  for (const pluginAndComponentArray of EnvStateMigrationComponentNames) {
    const pluginName = pluginAndComponentArray[0];
    const componentName = pluginAndComponentArray[1];
    if (pluginName !== componentName)
      content = content.replace(new RegExp(`state.${pluginName}`, "g"), `state.${componentName}`);
  }
  return content;
}

export function convertManifestTemplateToV2(content: string): string {
  for (const pluginAndComponentArray of EnvStateMigrationComponentNames) {
    const pluginName = pluginAndComponentArray[0];
    const componentName = pluginAndComponentArray[1];
    if (pluginName !== componentName)
      content = content.replace(new RegExp(`state.${componentName}`, "g"), `state.${pluginName}`);
  }
  return content;
}
