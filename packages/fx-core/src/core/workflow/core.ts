// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Inputs, ok, Result, TokenProvider, v2, v3 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Container, Service } from "typedi";
import {
  BotOptionItem,
  CommandAndResponseOptionItem,
  MessageExtensionItem,
  NotificationOptionItem,
  TabOptionItem,
  TabSPFxItem,
} from "../../plugins/solution/fx-solution/question";
import "./aad";
import "./azureBot";
import "./azureFunction";
import "./azureStorage";
import "./azureWebApp";
import {
  Action,
  AzureResource,
  ConfigureAction,
  ContextV3,
  GroupAction,
  MaybePromise,
  ProjectSettingsV3,
  ResourceConfig,
  ScaffoldResource,
} from "./interface";
import "./teamsBot";
import "./teamsManifest";
import { getResource } from "./workflow";

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
        };
        (context.projectSetting as any)["resources"] = [];
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
    inputs: v2.InputsWithProjectPath & { capabilities: string[] }
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const actions: Action[] = [
      {
        type: "call",
        required: false,
        targetAction: "fx.init",
      },
    ];
    if (inputs.capabilities.includes(TabOptionItem.id)) {
      actions.push({
        type: "call",
        required: false,
        targetAction: "teams-tab.add",
        inputs: {
          "teams-tab": {
            framework: "react",
          },
        },
      });
    }
    if (inputs.capabilities.includes(TabSPFxItem.id)) {
      actions.push({
        type: "call",
        required: false,
        targetAction: "teams-tab.add",
        inputs: {
          "teams-tab": {
            framework: "spfx",
            hostingResource: "spfx",
          },
        },
      });
    }
    const scenarios = [];
    if (inputs.capabilities.includes(BotOptionItem.id)) {
      scenarios.push("default");
    }
    if (inputs.capabilities.includes(NotificationOptionItem.id)) {
      scenarios.push("notification");
    }
    if (inputs.capabilities.includes(CommandAndResponseOptionItem.id)) {
      scenarios.push("commandAndResponse");
    }
    if (inputs.capabilities.includes(MessageExtensionItem.id)) {
      scenarios.push("messageExtension");
    }
    if (scenarios.length > 0) {
      actions.push({
        type: "call",
        required: false,
        targetAction: "teams-bot.add",
        inputs: {
          "teams-bot": {
            scenarios: scenarios,
          },
        },
      });
    }
    actions.push({
      type: "call",
      required: true,
      targetAction: "fx.persistBicep",
    });
    const action: GroupAction = {
      name: "fx.create",
      type: "group",
      inputs: {
        bicep: {},
      },
      actions: actions,
    };
    return ok(action);
  }
  add(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const addInputs = inputs[this.name];
    const resource = addInputs.resource;
    if (!resource) throw new Error("fx.add: resource is empty");
    const actions: Action[] = [
      {
        type: "call",
        required: false,
        targetAction: `${resource}.generateCode`,
      },
      {
        type: "call",
        required: false,
        targetAction: `${resource}.generateBicep`,
      },
      {
        type: "call",
        required: true,
        targetAction: "fx.persistBicep",
      },
    ];
    const action: GroupAction = {
      name: "fx.add",
      type: "group",
      inputs: {
        bicep: {},
      },
      actions: actions,
    };
    return ok(action);
  }
  persistBicep(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      type: "function",
      name: "fx.persistBicep",
      plan: (context: v2.Context, inputs: Inputs) => {
        return ok(["persist bicep files if there are bicep outputs"]);
      },
      execute: async (context: v2.Context, inputs: Inputs) => {
        if (inputs.bicep && Object.keys(inputs.bicep).length > 0) {
          console.log(`persist bicep files: ${Object.keys(inputs.bicep).join(", ")}`);
        } else {
          console.log("nothing to persist for bicep files");
        }
        return ok(undefined);
      },
    };
    return ok(action);
  }
  deployBicep(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      type: "function",
      name: "fx.deployBicep",
      plan: (context: v2.Context, inputs: Inputs) => {
        return ok(["deploy bicep to ARM"]);
      },
      execute: async (context: v2.Context, inputs: Inputs) => {
        console.log("deploy bicep");
        inputs["azure-storage"] = {
          endpoint: "MockStorageEndpoint",
        };
        inputs["azure-web-app"] = {
          endpoint: "MockAzureWebAppEndpoint",
        };
        return ok(undefined);
      },
    };
    return ok(action);
  }
  provision(
    context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const projectSettings = context.ctx.projectSetting as ProjectSettingsV3;
    const resourcesToProvision = projectSettings.resources.filter((r) => r.provision);
    const provisionActions: Action[] = resourcesToProvision.map((r) => {
      return {
        type: "call",
        required: false,
        targetAction: `${r.name}.provision`,
      };
    });
    const configureActions: Action[] = resourcesToProvision.map((r) => {
      return {
        type: "call",
        required: false,
        targetAction: `${r.name}.configure`,
      };
    });
    const provisionSequences: Action[] = [
      {
        type: "function",
        name: "fx.commonConfig",
        plan: (context: v2.Context, inputs: Inputs) => {
          return ok(["check common configs (account, resource group)"]);
        },
        execute: async (context: v2.Context, inputs: Inputs) => {
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
        mode: "parallel",
        actions: provisionActions,
      },
      {
        type: "call",
        required: true,
        targetAction: "fx.deployBicep",
      },
    ];

    const teamsBot = getResource(projectSettings, "teams-bot") as ResourceConfig;
    const teamsTab = getResource(projectSettings, "teams-tab") as ResourceConfig;
    if (teamsBot) {
      provisionSequences.push({
        type: "call",
        name: "call:azure-bot.provision",
        required: false,
        targetAction: "azure-bot.provision",
      });
    }
    if (configureActions.length > 0) {
      const setInputsForConfig: ConfigureAction = {
        type: "function",
        name: "prepare inputs for configuration stage",
        plan: (
          context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
          inputs: v2.InputsWithProjectPath
        ) => {
          return ok(["set inputs for configuration"]);
        },
        execute: (
          context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
          inputs: v2.InputsWithProjectPath
        ) => {
          const projectSettings = context.ctx.projectSetting as ProjectSettingsV3;
          const teamsTab = getResource(projectSettings, "teams-tab") as ResourceConfig;
          const teamsBot = getResource(projectSettings, "teams-bot") as ResourceConfig;
          const aad = getResource(projectSettings, "aad");
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
        mode: "parallel",
        actions: configureActions,
      });
    }
    const manifestInputs: any = {};
    if (teamsTab) manifestInputs.tabEndpoint = `{{${teamsTab.hostingResource}.endpoint}}`;
    if (teamsBot) manifestInputs.botId = "{{azure-bot.botId}}";
    provisionSequences.push({
      type: "call",
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

  build(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): Result<Action | undefined, FxError> {
    const projectSettings = context.projectSetting as ProjectSettingsV3;
    const actions: Action[] = projectSettings.resources
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
    context: v2.Context,
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
    projectSettings.resources
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
