// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  Component,
  ContextV3,
  FxError,
  GroupAction,
  InputsWithProjectPath,
  MaybePromise,
  ok,
  ProjectSettingsV3,
  Result,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { getProjectSettingsPath } from "../../core/middleware/projectSettingsLoader";
import { getComponent } from "../workflow";
import "../connection/azureWebAppConfig";
import "../resource/azureSql";
import "../resource/identity";
import { ComponentNames } from "../constants";
import { getHostingComponent } from "../utils";

@Service("sso")
export class SSO {
  name = "sso";

  /**
   * 1. config sso/aad
   * 2. generate aad manifest
   * 3. genearte aad bicep
   * 4. genearte aad auth files
   * 5. update app manifest
   */
  add(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    let needsBot = false;
    let needsBotHostingConnection = false;
    let needsTab = false;
    let needsTabApiConnection = false;
    const aadComponent = getComponent(context.projectSetting, ComponentNames.AadApp);
    const teamsBotComponent = getComponent(context.projectSetting, ComponentNames.TeamsBot);
    if (teamsBotComponent && !teamsBotComponent.sso) {
      needsBot = teamsBotComponent.hosting !== ComponentNames.Function;
    }
    if (needsBot) {
      const botHosting = teamsBotComponent?.hosting;
      if (botHosting) {
        const botHostingComponent = getHostingComponent(teamsBotComponent!, context.projectSetting);
        needsBotHostingConnection = !botHostingComponent?.connections?.includes(
          ComponentNames.AadApp
        );
      }
    }
    const teamsTabComponent = getComponent(context.projectSetting, ComponentNames.TeamsTab);
    if (teamsTabComponent && !teamsTabComponent.sso) {
      needsTab = true;
      const apiComponent = getTabApiComponent(teamsTabComponent, context.projectSetting);
      needsTabApiConnection = !apiComponent?.connections?.includes(ComponentNames.AadApp);
    }

    const actions: Action[] = [
      {
        name: "SSO.configSSO",
        type: "function",
        plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
          const remarks: string[] = [];
          if (!aadComponent) {
            remarks.push("add component 'aad-app' in projectSettings");
          }
          if (needsBot) {
            remarks.push("add feature 'SSO' to component 'teams-bot' in projectSettings");
            if (needsBotHostingConnection) {
              remarks.push(
                `connect 'aad-app' to component ${teamsBotComponent?.hosting} in projectSettings`
              );
            }
          }
          if (needsTab) {
            remarks.push("add feature 'SSO' to component 'teams-tab' in projectSettings");
            if (needsTabApiConnection) {
              remarks.push(
                `connect 'aad-app' to component 'azure-function' of teams-api in projectSettings`
              );
            }
          }
          return ok([
            {
              type: "file",
              operate: "replace",
              filePath: getProjectSettingsPath(inputs.projectPath),
              remarks: remarks.join(";"),
            },
          ]);
        },
        execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
          const remarks: string[] = [];
          const projectSettings = context.projectSetting;
          if (!aadComponent) {
            remarks.push("add component 'aad-app' in projectSettings");
          }
          projectSettings.components.push({
            name: "aad-app",
            provision: true,
          });
          if (needsBot && teamsBotComponent) {
            teamsBotComponent.sso = true;
            remarks.push("add feature 'SSO' to component 'teams-bot' in projectSettings");
            if (needsBotHostingConnection) {
              const botHostingComponent = getHostingComponent(
                teamsBotComponent,
                context.projectSetting
              );
              botHostingComponent?.connections?.push(ComponentNames.AadApp);
              remarks.push(
                `connect 'aad-app' to component ${teamsBotComponent.hosting} in projectSettings`
              );
            }
          }
          if (needsTab && teamsTabComponent) {
            teamsTabComponent.sso = true;
            remarks.push("add feature 'SSO' to component 'teams-tab' in projectSettings");
            if (needsTabApiConnection) {
              const tabApiComponent = getTabApiComponent(teamsTabComponent, context.projectSetting);
              tabApiComponent?.connections?.push(ComponentNames.AadApp);
              remarks.push(
                `connect 'aad-app' to component 'azure-function' of teams-api in projectSettings`
              );
            }
          }
          return ok([
            {
              type: "file",
              operate: "replace",
              filePath: getProjectSettingsPath(inputs.projectPath),
              remarks: remarks.join(";"),
            },
          ]);
        },
      },
      {
        name: "call:aad-app.generateManifest",
        type: "call",
        required: true,
        targetAction: "aad-app.generateManifest",
        inputs: {},
      },
      {
        name: "call:aad-app.generateBicep",
        type: "call",
        required: true,
        targetAction: "aad-app.generateBicep",
        inputs: {},
      },
      {
        name: "call:aad-app.generateAuthFiles",
        type: "call",
        required: true,
        targetAction: "aad-app.generateAuthFiles",
        inputs: {
          needsBot: needsBot,
          needsTab: needsTab,
        },
      },
      {
        name: "call:app-manifest.addCapability",
        type: "call",
        required: true,
        targetAction: "app-manifest.addCapability",
        inputs: {
          capabilities: [{ name: "WebApplicationInfo" }],
        },
      },
      {
        name: "call:debug.generateLocalDebugSettings",
        type: "call",
        required: true,
        targetAction: "debug.generateLocalDebugSettings",
      },
    ];
    if (needsBotHostingConnection) {
      const botHosting = teamsBotComponent?.hosting;
      actions.push({
        name: `call:${botHosting}-config.generateBicep`,
        type: "call",
        required: true,
        targetAction: `${botHosting}-config.generateBicep`,
        inputs: {
          update: true,
          scenario: "Bot",
        },
      });
    }
    if (needsTabApiConnection) {
      const tabApi = getTabApiComponent(teamsTabComponent!, context.projectSetting);
      actions.push({
        name: `call:${tabApi?.name}-config.generateBicep`,
        type: "call",
        required: true,
        targetAction: `${tabApi?.name}-config.generateBicep`,
      });
    }
    const group: GroupAction = {
      type: "group",
      name: "sso.add",
      mode: "sequential",
      actions: actions,
    };
    return ok(group);
  }
}

// TODO: replace it after tab component update
function getTabApiComponent(
  tabComponent: Component,
  projectSettings: ProjectSettingsV3
): Component | undefined {
  return getComponent(projectSettings, ComponentNames.Function);
}
