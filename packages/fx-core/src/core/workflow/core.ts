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
  AddResourceInputs,
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
          resources: [],
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
  add(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const addInputs = (inputs as AddResourceInputs).fx;
    const actions: Action[] = [];
    addInputs.resources.forEach((r) => {
      const addResourceActionRes = addResource(r, context, inputs);
      if (addResourceActionRes.isOk() && addResourceActionRes.value) {
        actions.push(addResourceActionRes.value);
      }
    });
    const callResourceAddAction: GroupAction = {
      type: "group",
      name: "call:resource.add",
      mode: "parallel",
      actions: actions,
    };
    const callResourceAddAndPersistBicep: GroupAction = {
      type: "group",
      name: "resource.add+fx.persistBicep",
      inputs: {
        bicep: {},
      },
      actions: [
        callResourceAddAction,
        {
          type: "call",
          required: true,
          targetAction: "fx.persistBicep",
        },
      ],
    };
    return ok(callResourceAddAndPersistBicep);
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
        name: "resources.provision",
        mode: "parallel",
        actions: provisionActions,
      },
      {
        type: "call",
        name: "call:fx.deployBicep",
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

export function addResource(
  resource: ResourceConfig,
  context: ContextV3,
  inputs: v2.InputsWithProjectPath
): Result<Action | undefined, FxError> {
  const resourcePlugin = Container.get(resource.name) as ScaffoldResource | AzureResource;
  if (resourcePlugin.type === "azure") {
    const action: Action = {
      type: "call",
      required: true,
      targetAction: `${resource.name}.generateBicep`,
      inputs: {
        [resource.name]: resource,
      },
    };
    return ok(action);
  } else if (resourcePlugin.type === "scaffold") {
    const action: Action = {
      type: "call",
      required: true,
      targetAction: `${resource.name}.generateCode`,
      inputs: {
        [resource.name]: resource,
      },
    };
    return ok(action);
  } else {
    const action: Action = {
      type: "call",
      required: true,
      targetAction: `${resource.name}.add`,
      inputs: {
        [resource.name]: resource,
      },
    };
    return ok(action);
  }
}
