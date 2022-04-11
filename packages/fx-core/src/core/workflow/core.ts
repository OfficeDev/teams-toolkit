// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Inputs, ok, Result, TokenProvider, v2, v3 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import "./Aad";
import "./ApiCodeProvider";
import "./AzureBicepProvider";
import "./AzureBot";
import "./AzureFunction";
import "./AzureSql";
import "./AzureStorage";
import "./AzureWebApp";
import "./BotCodeProvider";
import "./Spfx";
import "./TeamsManifest";
import {
  Action,
  Component,
  ContextV3,
  GroupAction,
  MaybePromise,
  ProjectSettingsV3,
  TeamsBotInputs,
  TeamsTabInputs,
} from "./interface";
import { getComponent } from "./workflow";

@Service("fx")
export class TeamsfxCore {
  name = "fx";
  init(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const initProjectSettings: Action = {
      type: "function",
      name: "fx.initConfig",
      plan: (context: ContextV3, inputs: Inputs) => {
        return ok(["init teamsfx project settings"]);
      },
      execute: async (context: ContextV3, inputs: Inputs) => {
        console.log("init teamsfx project settings");
        context.projectSetting = {
          projectId: "123",
          appName: "test",
          solutionSettings: {
            name: "fx",
            activeResourcePlugins: [],
          },
          programmingLanguage: inputs["programming-language"],
          components: [],
        };
        return ok(undefined);
      },
    };
    const action: Action = {
      type: "group",
      name: "fx.init",
      actions: [
        initProjectSettings,
        {
          type: "call",
          targetAction: "teams-manifest.init",
          required: true,
        },
      ],
    };
    return ok(action);
  }
  create(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const actions: Action[] = [
      {
        type: "call",
        required: true,
        targetAction: "fx.init",
      },
      {
        type: "call",
        required: true,
        targetAction: "fx.add",
      },
    ];
    const action: GroupAction = {
      name: "fx.create",
      type: "group",
      actions: actions,
    };
    return ok(action);
  }
  addBot(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const teamsBotInputs = (inputs as TeamsBotInputs)["teams-bot"];
    const actions: Action[] = [
      {
        name: "fx.configBot",
        type: "function",
        plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
          const teamsBotInputs = (inputs as TeamsBotInputs)["teams-bot"];
          const component: Component = {
            name: "teams-bot",
            ...teamsBotInputs,
          };
          return ok([
            `add components 'teams-bot', '${
              teamsBotInputs.hostingResource
            }' in projectSettings: ${JSON.stringify(component)}`,
          ]);
        },
        execute: async (
          context: ContextV3,
          inputs: v2.InputsWithProjectPath
        ): Promise<Result<undefined, FxError>> => {
          const teamsBotInputs = (inputs as TeamsBotInputs)["teams-bot"];
          const projectSettings = context.projectSetting;
          const component: Component = {
            name: "teams-bot",
            ...teamsBotInputs,
          };
          projectSettings.components.push(component);
          projectSettings.components.push({
            name: teamsBotInputs.hostingResource,
            provision: true,
          });
          console.log(
            `add components 'teams-bot', 'azure-bot', '${
              teamsBotInputs.hostingResource
            }' in projectSettings: ${JSON.stringify(component)}`
          );
          return ok(undefined);
        },
      },
      {
        name: "call:bot-code.generate",
        type: "call",
        required: false,
        targetAction: "bot-code.generate",
      },
      {
        name: "call:azure-bicep.generate",
        type: "call",
        required: false,
        targetAction: "azure-bicep.generate",
        inputs: {
          "azure-bicep": {
            resources: [teamsBotInputs.hostingResource],
          },
        },
      },
      {
        name: "call:teams-manifest.addCapability",
        type: "call",
        required: true,
        targetAction: "teams-manifest.addCapability",
        inputs: {
          "teams-manifest": {
            capabilities: [{ name: "Bot" }],
          },
        },
      },
    ];
    const group: GroupAction = {
      type: "group",
      name: "fx.addBot",
      mode: "parallel",
      actions: actions,
    };
    return ok(group);
  }
  addTab(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const teamsTabInputs = (inputs as TeamsTabInputs)["teams-tab"];
    const actions: Action[] = [
      {
        name: "fx.configTab",
        type: "function",
        plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
          const teamsTabInputs = (inputs as TeamsTabInputs)["teams-tab"];
          return ok([
            `add component 'teams-tab' in projectSettings: ${JSON.stringify(teamsTabInputs)}`,
          ]);
        },
        execute: async (
          context: ContextV3,
          inputs: v2.InputsWithProjectPath
        ): Promise<Result<undefined, FxError>> => {
          const teamsTabInputs = (inputs as TeamsTabInputs)["teams-tab"];
          const projectSettings = context.projectSetting as ProjectSettingsV3;
          const teamsTabResource: Component = {
            name: "teams-tab",
            ...teamsTabInputs,
          };
          projectSettings.components.push(teamsTabResource);
          console.log(
            `add component 'teams-tab' in projectSettings: ${JSON.stringify(teamsTabResource)}`
          );
          return ok(undefined);
        },
      },
      {
        name: "call:tab-code.generate",
        type: "call",
        required: true,
        targetAction: "tab-code.generate",
      },
      {
        name: "call:azure-bicep.generate",
        type: "call",
        required: false,
        targetAction: "azure-bicep.generate",
        inputs: {
          "azure-bicep": {
            resources: [teamsTabInputs.hostingResource],
          },
        },
      },
      {
        name: "call:teams-manifest.addCapability",
        type: "call",
        required: true,
        targetAction: "teams-manifest.addCapability",
        inputs: {
          "teams-manifest": {
            capabilities: [{ name: "staticTab" }],
          },
        },
      },
    ];
    const group: GroupAction = {
      type: "group",
      name: "fx.addTab",
      mode: "parallel",
      actions: actions,
    };
    return ok(group);
  }
  provision(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const projectSettings = context.projectSetting as ProjectSettingsV3;
    const resourcesToProvision = projectSettings.components.filter((r) => r.provision);
    const provisionActions: Action[] = resourcesToProvision.map((r) => {
      return {
        type: "call",
        name: `call:${r.name}.provision`,
        required: false,
        targetAction: `${r.name}.provision`,
      };
    });
    const configureActions: Action[] = resourcesToProvision.map((r) => {
      return {
        type: "call",
        name: `call:${r.name}.configure`,
        required: false,
        targetAction: `${r.name}.configure`,
      };
    });
    const provisionSequences: Action[] = [
      {
        type: "function",
        name: "fx.commonConfig",
        plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
          return ok(["check common configs (account, resource group)"]);
        },
        execute: async (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
          console.log("check common configs (account, resource group)");
          inputs.solution = {
            tenantId: "MockTenantId",
            subscriptionId: "MockSubscriptionId",
            resourceGroup: "MockResourceGroup",
          };
          return ok(undefined);
        },
      },
      {
        type: "group",
        name: "resources.provision",
        mode: "parallel",
        actions: provisionActions,
      },
      {
        type: "call",
        name: "call:azure-bicep.deploy",
        required: true,
        targetAction: "azure-bicep.deploy",
      },
    ];

    const teamsBot = getComponent(projectSettings, "teams-bot") as Component;
    const teamsTab = getComponent(projectSettings, "teams-tab") as Component;
    if (teamsBot) {
      provisionSequences.push({
        type: "call",
        name: "call:azure-bot.provision",
        required: false,
        targetAction: "azure-bot.provision",
      });
    }
    if (configureActions.length > 0) {
      const setInputsForConfig: Action = {
        type: "function",
        name: "prepare inputs for configuration stage",
        plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
          return ok(["set inputs for configuration"]);
        },
        execute: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
          const projectSettings = context.projectSetting as ProjectSettingsV3;
          const teamsTab = getComponent(projectSettings, "teams-tab") as Component;
          const teamsBot = getComponent(projectSettings, "teams-bot") as Component;
          const aad = getComponent(projectSettings, "aad");
          let aadOutputs: any;
          if (aad) {
            aadOutputs = inputs["aad"] || {};
            if (teamsTab && teamsBot) {
              aadOutputs.m365ApplicationIdUri = `api://${
                inputs[teamsTab.hostingResource!].endpoint
              }/botid-${inputs["azure-bot"].botId}`;
            } else if (teamsTab) {
              aadOutputs.m365ApplicationIdUri = `api://${
                inputs[teamsTab.hostingResource!].endpoint
              }`;
            } else {
              aadOutputs.m365ApplicationIdUri = `api://botid-${inputs["azure-bot"].botId}`;
            }
            inputs["aad"] = aadOutputs;
            if (teamsTab) {
              inputs[teamsTab.hostingResource!].appSettings = {
                M365_AUTHORITY_HOST: aadOutputs.authAuthorityHost, // AAD authority host
                M365_CLIENT_ID: aadOutputs.clientId, // Client id of AAD application
                M365_CLIENT_SECRET: aadOutputs.clientSecret, // Client secret of AAD application
                M365_TENANT_ID: aadOutputs.tenantId, // Tenant id of AAD application
                M365_APPLICATION_ID_URI: aadOutputs.m365ApplicationIdUri, // Application ID URI of AAD application
              };
            }
            if (teamsBot) {
              inputs[teamsBot.hostingResource!].appSettings = {
                BOT_ID: inputs["azure-bot"].botId,
                BOT_PASSWORD: inputs["azure-bot"].botPassword,
                M365_AUTHORITY_HOST: aadOutputs.authAuthorityHost, // AAD authority host
                M365_CLIENT_ID: aadOutputs.clientId, // Client id of AAD application
                M365_CLIENT_SECRET: aadOutputs.clientSecret, // Client secret of AAD application
                M365_TENANT_ID: aadOutputs.tenantId, // Tenant id of AAD application
                M365_APPLICATION_ID_URI: aadOutputs.m365ApplicationIdUri, // Application ID URI of AAD application
              };
            }
          } else {
            if (teamsBot) {
              inputs[teamsBot.hostingResource!].appSettings = {
                BOT_ID: inputs["azure-bot"].botId,
                BOT_PASSWORD: inputs["azure-bot"].botPassword,
              };
            }
          }
          console.log("set inputs for configuration");
          return ok(undefined);
        },
      };
      provisionSequences.push(setInputsForConfig);
      provisionSequences.push({
        type: "group",
        name: "resources.configure",
        mode: "parallel",
        actions: configureActions,
      });
    }
    const manifestInputs: any = {};
    if (teamsTab) manifestInputs.tabEndpoint = `{{${teamsTab.hostingResource}.endpoint}}`;
    if (teamsBot) manifestInputs.botId = "{{azure-bot.botId}}";
    provisionSequences.push({
      type: "call",
      name: "call:teams-manifest.provision",
      required: true,
      targetAction: "teams-manifest.provision",
      inputs: {
        "teams-manifest": manifestInputs,
      },
    });
    const result: Action = {
      name: "fx.provision",
      type: "group",
      actions: provisionSequences,
    };
    return ok(result);
  }

  build(context: ContextV3, inputs: v2.InputsWithProjectPath): Result<Action | undefined, FxError> {
    const projectSettings = context.projectSetting as ProjectSettingsV3;
    const actions: Action[] = projectSettings.components
      .filter((resource) => resource.build)
      .map((resource) => {
        return {
          name: `call:${resource.name}.build`,
          type: "call",
          targetAction: `${resource.name}.build`,
          required: false,
        };
      });
    const group: Action = {
      type: "group",
      mode: "parallel",
      actions: actions,
    };
    return ok(group);
  }

  deploy(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const projectSettings = context.projectSetting as ProjectSettingsV3;
    const actions: Action[] = [
      {
        name: "call:fx.build",
        type: "call",
        targetAction: "fx.build",
        required: false,
      },
    ];
    projectSettings.components
      .filter((resource) => resource.build && resource.hostingResource)
      .forEach((resource) => {
        actions.push({
          type: "call",
          targetAction: `${resource.hostingResource}.deploy`,
          required: false,
          inputs: {
            [resource.hostingResource!]: {
              folder: resource.folder,
              type: resource.deployType,
            },
          },
        });
      });
    const action: GroupAction = {
      type: "group",
      name: "fx.deploy",
      actions: actions,
    };
    return ok(action);
  }
}
