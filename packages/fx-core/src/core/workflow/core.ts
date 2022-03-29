// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureSolutionSettings,
  FxError,
  Inputs,
  Json,
  ok,
  Result,
  v2,
} from "@microsoft/teamsfx-api";
import * as Handlebars from "handlebars";
import { assign, merge } from "lodash";
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
import { Action, GroupAction, MaybePromise } from "./interface";
import "./teamsBot";
import "./teamsManifest";

@Service("fx")
export class TeamsfxCore {
  name = "fx";
  init(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const initProjectSettings: Action = {
      type: "function",
      name: "fx.initConfig",
      plan: (context: v2.Context, inputs: Inputs) => {
        return ok(["init teamsfx project settings"]);
      },
      execute: async (context: v2.Context, inputs: Inputs) => {
        console.log("init teamsfx project settings");
        context.projectSetting = {
          projectId: "123",
          appName: "test",
          solutionSettings: {
            name: "fx",
            activeResourcePlugins: [],
          },
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
    context: v2.Context,
    inputs: v2.InputsWithProjectPath & { capabilities: string[] }
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const actions: Action[] = [
      {
        type: "call",
        required: false,
        targetAction: `fx.init`,
      },
    ];
    if (inputs.capabilities.includes(TabOptionItem.id)) {
      actions.push({
        type: "call",
        required: false,
        targetAction: `fx.add`,
        inputs: {
          resource: "teams-tab",
          framework: "react",
          hostingResource: "{{tab.hostingResource}}",
        },
      });
    }
    if (inputs.capabilities.includes(TabSPFxItem.id)) {
      actions.push({
        type: "call",
        required: false,
        targetAction: `fx.add`,
        inputs: {
          resource: "teams-tab",
          hostingResource: "spfx",
        },
      });
    }
    if (
      inputs.capabilities.includes(BotOptionItem.id) ||
      inputs.capabilities.includes(NotificationOptionItem.id) ||
      inputs.capabilities.includes(CommandAndResponseOptionItem.id) ||
      inputs.capabilities.includes(MessageExtensionItem.id)
    ) {
      if (inputs.capabilities.includes(BotOptionItem.id)) {
        actions.push({
          type: "call",
          required: false,
          targetAction: `fx.add`,
          inputs: {
            resource: "teams-bot",
            scenario: "default",
            hostingResource: "{{bot.hostingResource}}",
          },
        });
      }
      if (inputs.capabilities.includes(NotificationOptionItem.id)) {
        actions.push({
          type: "call",
          required: false,
          targetAction: `fx.add`,
          inputs: {
            resource: "teams-bot",
            scenario: "notification",
            hostingResource: "{{bot.hostingResource}}",
          },
        });
      }
      if (inputs.capabilities.includes(CommandAndResponseOptionItem.id)) {
        actions.push({
          type: "call",
          required: false,
          targetAction: `fx.add`,
          inputs: {
            resource: "teams-bot",
            scenario: "commandAndResponse",
            hostingResource: "{{bot.hostingResource}}",
          },
        });
      }
      if (inputs.capabilities.includes(MessageExtensionItem.id)) {
        actions.push({
          type: "call",
          required: false,
          targetAction: `fx.add`,
          inputs: {
            resource: "teams-bot",
            scenario: "messageExtension",
            hostingResource: "{{bot.hostingResource}}",
          },
        });
      }
    }
    const action: GroupAction = {
      name: "fx.create",
      type: "group",
      actions: actions,
    };
    return ok(action);
  }
  add(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath & { resource: string }
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const resource = inputs.resource;
    if (!resource) throw new Error(`fx.add: resource is empty`);
    const actions: Action[] = [];
    actions.push({
      type: "call",
      required: false,
      targetAction: `${resource}.addInstance`,
    });
    actions.push({
      type: "call",
      required: false,
      targetAction: `${resource}.generateCode`,
    });
    actions.push({
      type: "call",
      required: false,
      targetAction: `${resource}.generateBicep`,
    });
    actions.push({
      type: "call",
      required: true,
      targetAction: `fx.persistBicep`,
    });
    const action: GroupAction = {
      name: "fx.add",
      type: "group",
      actions: actions,
      inputs: {
        bicep: {},
      },
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
          console.log(`persist bicep files: ${Object.keys(inputs.bicep)}`);
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
  preProvision(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      type: "function",
      name: "fx.preProvision",
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
    };
    return ok(action);
  }
  provision(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const solutionSetting = context.projectSetting.solutionSettings as AzureSolutionSettings;
    const provisionActions: Action[] = solutionSetting.activeResourcePlugins
      .filter((p) => p !== "azure-bot")
      .map((p) => {
        return {
          type: "call",
          required: false,
          targetAction: `${p}.provision`,
        };
      });
    const configureActions: Action[] = solutionSetting.activeResourcePlugins.map((p) => {
      return {
        type: "call",
        required: false,
        targetAction: `${p}.configure`,
      };
    });
    const provisionSequences: Action[] = [
      {
        type: "call",
        required: false,
        targetAction: "fx.preProvision",
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
    if (solutionSetting.activeResourcePlugins.includes("azure-bot")) {
      provisionSequences.push({
        type: "call",
        required: false,
        targetAction: "azure-bot.provision",
      });
    }
    provisionSequences.push({
      type: "group",
      mode: "parallel",
      actions: configureActions,
      inputs: {
        tab: { endpoint: "{{azure-storage.endpoint}}" },
        bot: { endpoint: "{{azure-web-app.endpoint}}" },
        aad: {
          m365ApplicationIdUri: "api://{{tab.endpoint}}/botid-{{azure-bot.botId}}",
        },
        "azure-web-app": {
          appSettings: {
            M365_AUTHORITY_HOST: "{{aad.authAuthorityHost}}", // AAD authority host
            M365_CLIENT_ID: "{{aad.clientId}}", // Client id of AAD application
            M365_CLIENT_SECRET: "{{aad.clientSecret}}", // Client secret of AAD application
            M365_TENANT_ID: "{{aad.tenantId}}", // Tenant id of AAD application
            M365_APPLICATION_ID_URI: "{{aad.m365ApplicationIdUri}}", // Application ID URI of AAD application
            BOT_ID: "{{azure-bot.botId}}",
            BOT_PASSWORD: "{{azure-bot.botPassword}}",
          },
        },
      },
    });
    provisionSequences.push({
      type: "call",
      required: true,
      targetAction: "teams-manifest.provision",
    });
    return ok({
      name: "fx.provision",
      type: "group",
      actions: provisionSequences,
    });
  }
  deploy(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const botConfig = (context.projectSetting as any).bot;
    const tabConfig = (context.projectSetting as any).tab;
    const actions: Action[] = [];
    if (botConfig) {
      actions.push({
        type: "call",
        targetAction: "teams-bot.deploy",
        required: true,
      });
    }
    if (tabConfig) {
      actions.push({
        type: "call",
        targetAction: "teams-tab.deploy",
        required: true,
      });
    }
    const action: GroupAction = {
      type: "group",
      name: "fx.deploy",
      actions: actions,
    };
    return ok(action);
  }
}

export async function getAction(
  name: string,
  context: any,
  inputs: any
): Promise<Action | undefined> {
  const arr = name.split(".");
  const resourceName = arr[0];
  const actionName = arr[1];
  if (!resourceName) throw new Error(`invalid action name: ${name}`);
  const resource = Container.get(resourceName) as any;
  if (resource[actionName]) {
    const res = await resource[actionName](context, inputs);
    if (res.isOk()) {
      const action = res.value;
      return action;
    }
  }
  return undefined;
}

function _templateReplace(schema: Json, context: Json, rootContext: Json) {
  let change = false;
  for (const key of Object.keys(schema)) {
    const subSchema = schema[key];
    if (typeof subSchema === "string") {
      const template = Handlebars.compile(subSchema);
      const newValue = template(rootContext);
      if (newValue !== subSchema) {
        change = true;
      }
      schema[key] = newValue;
      context[key] = newValue;
    } else if (typeof subSchema === "object") {
      let subContext = context[key];
      if (!subContext) {
        subContext = {};
        assign(subContext, subSchema);
        context[key] = subContext;
      } else {
        merge(subContext, subSchema);
      }
      const valueIsChange = _templateReplace(subSchema, subContext, rootContext);
      if (valueIsChange) change = true;
    }
  }
  return change;
}

function templateReplace(schema: Json, params: Json) {
  let change;
  do {
    change = _templateReplace(schema, params, params);
  } while (change);
}

export async function resolveAction(action: Action, context: any, inputs: any): Promise<Action> {
  // console.log(`resolveAction`);
  // console.log(action);
  if (action.type === "call") {
    if (action.inputs) {
      templateReplace(action.inputs, inputs);
    }
    const targetAction = await getAction(action.targetAction, context, inputs);
    if (targetAction) {
      if (targetAction.type !== "function") {
        const resolvedAction = await resolveAction(targetAction, context, inputs);
        if (action.inputs) {
          (resolvedAction as any)["inputs"] = action.inputs;
        }
        return resolvedAction;
      }
    }
    return action;
  } else if (action.type === "group") {
    if (action.inputs) {
      templateReplace(action.inputs, inputs);
    }
    for (let i = 0; i < action.actions.length; ++i) {
      action.actions[i] = await resolveAction(action.actions[i], context, inputs);
    }
  }
  return action;
}

export async function planAction(context: any, inputs: any, action: Action): Promise<void> {
  if (!inputs.step) inputs.step = 1;
  if (action.type === "function") {
    const planRes = await action.plan(context, inputs);
    if (planRes.isOk()) {
      for (const plan of planRes.value) {
        console.log(`---- plan [${inputs.step}]: [${action.name}] - ${plan}`);
      }
      inputs.step++;
    }
  } else if (action.type === "shell") {
    console.log(`---- plan[${inputs.step++}]: shell command: ${action.command}`);
  } else if (action.type === "call") {
    if (action.inputs) {
      templateReplace(action.inputs, inputs);
    }
    const targetAction = await getAction(action.targetAction, context, inputs);
    if (action.required && !targetAction) {
      throw new Error("targetAction not exist: " + action.targetAction);
    }
    if (targetAction) {
      await planAction(context, inputs, targetAction);
    }
  } else {
    if (action.inputs) {
      templateReplace(action.inputs, inputs);
    }
    for (const act of action.actions) {
      await planAction(context, inputs, act);
    }
  }
}

export async function executeAction(context: any, inputs: any, action: Action): Promise<void> {
  if (!inputs.step) inputs.step = 1;
  if (action.type === "function") {
    console.log(`##### execute [${inputs.step++}]: [${action.name}]`);
    await action.execute(context, inputs);
  } else if (action.type === "shell") {
    console.log(`##### shell [${inputs.step++}]: ${action.command}`);
  } else if (action.type === "call") {
    if (action.inputs) {
      templateReplace(action.inputs, inputs);
    }
    const targetAction = await getAction(action.targetAction, context, inputs);
    if (action.required && !targetAction) {
      throw new Error("action not exist: " + action.targetAction);
    }
    if (targetAction) {
      await executeAction(context, inputs, targetAction);
    }
  } else {
    if (action.inputs) {
      templateReplace(action.inputs, inputs);
    }
    for (const act of action.actions) {
      await executeAction(context, inputs, act);
    }
  }
}
