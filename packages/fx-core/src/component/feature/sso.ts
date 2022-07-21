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
  Platform,
  ProjectSettingsV3,
  Result,
  Stage,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { getProjectSettingsPath } from "../../core/middleware/projectSettingsLoader";
import { getComponent, getComponentByScenario } from "../workflow";
import "../connection/azureWebAppConfig";
import "../resource/azureSql";
import "../resource/identity";
import { ComponentNames, Scenarios } from "../constants";
import { getHostingComponent } from "../utils";
import { update } from "lodash";

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
    if (inputs.platform == Platform.CLI_HELP) {
      return ok(undefined);
    }

    const updates = getUpdateComponents(context, inputs);

    const actions: Action[] = [
      {
        name: "sso.configSSO",
        type: "function",
        plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
          const remarks: string[] = [];
          if (updates.aad) {
            remarks.push("add component 'aad-app' in projectSettings");
          }
          if (updates.bot) {
            remarks.push("add feature 'SSO' to component 'teams-bot' in projectSettings");
            if (updates.botHostingConnectgion) {
              remarks.push(`connect 'aad-app' to 'teams-bot' hosting in projectSettings`);
            }
          }
          if (updates.tab) {
            remarks.push("add feature 'SSO' to component 'teams-tab' in projectSettings");
            if (updates.tabApiConnection) {
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
          if (updates.aad) {
            remarks.push("add component 'aad-app' in projectSettings");
          }
          projectSettings.components.push({
            name: "aad-app",
            provision: true,
            deploy: true,
          });
          if (updates.bot) {
            const teamsBotComponent = getComponent(context.projectSetting, ComponentNames.TeamsBot);
            teamsBotComponent!.sso = true;
            remarks.push("add feature 'SSO' to component 'teams-bot' in projectSettings");
            if (updates.botHostingConnectgion) {
              const botHostingComponent = getHostingComponent(
                teamsBotComponent!,
                context.projectSetting
              );
              botHostingComponent?.connections?.push(ComponentNames.AadApp);
              remarks.push(
                `connect 'aad-app' to component ${teamsBotComponent!.hosting} in projectSettings`
              );
            }
          }
          if (updates.tab) {
            const teamsTabComponent = getComponent(context.projectSetting, ComponentNames.TeamsTab);
            teamsTabComponent!.sso = true;
            remarks.push("add feature 'SSO' to component 'teams-tab' in projectSettings");
            if (updates.tabApiConnection) {
              const tabApiComponent = getTabApiComponent(
                teamsTabComponent!,
                context.projectSetting
              );
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
      ...(inputs.stage === Stage.create ? [] : [generateAuthFilesAction(updates)]),
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
    if (updates.botHostingConnectgion) {
      const teamsBotComponent = getComponent(context.projectSetting, ComponentNames.TeamsBot);
      const botHosting = teamsBotComponent?.hosting;
      actions.push({
        name: `call:${botHosting}-config.generateBicep`,
        type: "call",
        required: true,
        targetAction: `${botHosting}-config.generateBicep`,
        inputs: {
          update: true,
          scenario: Scenarios.Bot,
        },
      });
    }
    if (updates.tabApiConnection) {
      const teamsTabComponent = getComponent(context.projectSetting, ComponentNames.TeamsTab);
      const tabApi = getTabApiComponent(teamsTabComponent!, context.projectSetting);
      actions.push({
        name: `call:${tabApi?.name}-config.generateBicep`,
        type: "call",
        required: true,
        targetAction: `${tabApi?.name}-config.generateBicep`,
        inputs: {
          update: true,
          scenario: Scenarios.Api,
        },
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

function getTabApiComponent(
  tabComponent: Component,
  projectSettings: ProjectSettingsV3
): Component | undefined {
  return getComponentByScenario(projectSettings, ComponentNames.Function, Scenarios.Api);
}

export interface updateComponents {
  bot?: boolean;
  botHostingConnectgion?: boolean;
  tab?: boolean;
  tabApiConnection?: boolean;
  aad?: boolean;
}

function generateAuthFilesAction(updates: updateComponents): Action {
  return {
    name: "call:aad-app.generateAuthFiles",
    type: "call",
    required: true,
    targetAction: "aad-app.generateAuthFiles",
    inputs: {
      needsBot: updates.bot,
      needsTab: updates.tab,
    },
  } as Action;
}

function getUpdateComponents(context: ContextV3, inputs: InputsWithProjectPath): updateComponents {
  if (inputs.stage === Stage.create) {
    return {
      tab: true,
      aad: true,
    };
  }
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
    needsTabApiConnection =
      !!apiComponent && !apiComponent.connections?.includes(ComponentNames.AadApp);
  }
  return {
    bot: needsBot,
    botHostingConnectgion: needsBotHostingConnection,
    tab: needsTab,
    tabApiConnection: needsTabApiConnection,
    aad: !aadComponent,
  };
}
