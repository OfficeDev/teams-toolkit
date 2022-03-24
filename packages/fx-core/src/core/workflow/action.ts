// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureSolutionSettings,
  FxError,
  Inputs,
  Json,
  ok,
  Platform,
  ProjectSettings,
  Result,
  TokenProvider,
  v2,
  v3,
} from "@microsoft/teamsfx-api";
import * as Handlebars from "handlebars";
import { assign, merge } from "lodash";
import "reflect-metadata";
import { Container, Service } from "typedi";
import { createV2Context } from "../../common";
import { ensureSolutionSettings } from "../../plugins/solution/fx-solution/utils/solutionSettingsHelper";
import { setTools } from "../globalVars";
import {
  Action,
  AddInstanceAction,
  AzureResourcePlugin,
  GenerateBicepAction,
  GroupAction,
  MaybePromise,
  ProvisionAction,
} from "./interface";
import { MockTools } from "./utils";

@Service("aad")
export class AADResource implements AzureResourcePlugin {
  name = "aad";
  addInstance(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    context.projectSetting.solutionSettings?.activeResourcePlugins.push(this.name);
    return ok(undefined);
  }
  provision(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const provision: ProvisionAction = {
      name: "aad.provision",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok("provision aad app registration");
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: Inputs
      ): Promise<Result<undefined, FxError>> => {
        inputs.aad = {
          clientId: "mockM365ClientId",
          clientSecret: "mockM365ClientId",
          authAuthorityHost: "mockM365OauthAuthorityHost",
          tenantId: "mockM365TenantId",
        };
        return ok(undefined);
      },
    };
    return ok(provision);
  }
  configure(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const configure: ProvisionAction = {
      name: "aad.configure",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok("configure aad app registration");
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: Inputs
      ): Promise<Result<undefined, FxError>> => {
        return ok(undefined);
      },
    };
    return ok(configure);
  }
}

@Service("azure-storage")
export class AzureStorageResource implements AzureResourcePlugin {
  name = "azure-storage";
  addInstance(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const addInstance: AddInstanceAction = {
      name: "azure-storage.addInstance",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok(
          `add an entry ${this.name} in projectSettings.solutionSettings.activeResourcePlugins`
        );
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        context.projectSetting.solutionSettings?.activeResourcePlugins.push(this.name);
        return ok(undefined);
      },
    };
    return ok(addInstance);
  }
  generateBicep(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const generateBicep: GenerateBicepAction = {
      name: "azure-storage.generateBicep",
      type: "function",
      plan: (context: v2.Context, inputs: Inputs) => {
        return ok("create azure storage bicep");
      },
      execute: async (
        context: v2.Context,
        inputs: Inputs
      ): Promise<Result<v3.BicepTemplate[], FxError>> => {
        return ok([]);
      },
    };
    return ok(generateBicep);
  }
  configure(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const configure: ProvisionAction = {
      name: "azure-storage.configure",
      type: "function",
      plan: (context: v2.Context, inputs: Inputs) => {
        return ok("configure azure storage (enable static web site)");
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: Inputs
      ): Promise<Result<undefined, FxError>> => {
        console.log("configure azure storage (enable static web site)");
        return ok(undefined);
      },
    };
    return ok(configure);
  }
}
@Service("azure-web-app")
export class AzureWebAppResource implements AzureResourcePlugin {
  name = "azure-web-app";
  addInstance(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const addInstance: AddInstanceAction = {
      name: "azure-web-app.addInstance",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok(
          `add an entry ${this.name} in projectSettings.solutionSettings.activeResourcePlugins`
        );
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        context.projectSetting.solutionSettings?.activeResourcePlugins.push(this.name);
        return ok(undefined);
      },
    };
    return ok(addInstance);
  }
  configure(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const configure: ProvisionAction = {
      name: "azure-web-app.configure",
      type: "function",
      plan: (context: v2.Context, inputs: Inputs) => {
        return ok("configure azure web app");
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: Inputs
      ): Promise<Result<undefined, FxError>> => {
        console.log(
          `configure azure web app using appSettings: ${JSON.stringify(
            inputs["azure-web-app.appSettings"]
          )}`
        );
        return ok(undefined);
      },
    };
    return ok(configure);
  }
}
@Service("azure-function")
export class AzureFunctionResource implements AzureResourcePlugin {
  name = "azure-function";
  addInstance(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const addInstance: AddInstanceAction = {
      name: "azure-function.addInstance",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok(
          `add an entry ${this.name} in projectSettings.solutionSettings.activeResourcePlugins`
        );
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        context.projectSetting.solutionSettings?.activeResourcePlugins.push(this.name);
        return ok(undefined);
      },
    };
    return ok(addInstance);
  }
  configure(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const configure: ProvisionAction = {
      name: "azure-function.configure",
      type: "function",
      plan: (context: v2.Context, inputs: Inputs) => {
        return ok("configure azure function");
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: Inputs
      ): Promise<Result<undefined, FxError>> => {
        console.log(
          `configure azure function using appSettings: ${JSON.stringify(
            inputs["azure-function.appSettings"]
          )}`
        );
        return ok(undefined);
      },
    };
    return ok(configure);
  }
}

@Service("azure-bot")
export class AzureBotResource implements AzureResourcePlugin {
  name = "azure-bot";
  addInstance(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const addInstance: AddInstanceAction = {
      name: "azure-bot.addInstance",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok(
          `add an entry ${this.name} in projectSettings.solutionSettings.activeResourcePlugins`
        );
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        context.projectSetting.solutionSettings?.activeResourcePlugins.push(this.name);
        return ok(undefined);
      },
    };
    return ok(addInstance);
  }
  provision(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const provision: ProvisionAction = {
      name: "azure-bot.provision",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok(
          "provision azure-bot (1.create AAD app for bot service; 2. create azure bot service)"
        );
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: Inputs
      ): Promise<Result<undefined, FxError>> => {
        inputs["azure-bot"] = {
          botAadAppClientId: "MockBotAadAppClientId",
          botId: "MockBotId",
          botPassword: "MockBotPassword",
        };
        return ok(undefined);
      },
    };
    return ok(provision);
  }
}

@Service("nodejs-bot")
export class NodejsBotResource implements AzureResourcePlugin {
  name = "nodejs-bot";
  addInstance(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const addInstance: AddInstanceAction = {
      name: "nodejs-bot.addInstance",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok(
          "ensure entry 'azure-web-app', 'azure-bot' in projectSettings.solutionSettings.activeResourcePlugins"
        );
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        ensureSolutionSettings(context.projectSetting);
        if (
          !context.projectSetting.solutionSettings?.activeResourcePlugins.includes("azure-web-app")
        )
          context.projectSetting.solutionSettings?.activeResourcePlugins.push("azure-web-app");
        if (!context.projectSetting.solutionSettings?.activeResourcePlugins.includes("azure-bot"))
          context.projectSetting.solutionSettings?.activeResourcePlugins.push("azure-bot");
        return ok(undefined);
      },
    };
    return ok(addInstance);
  }
  generateCode(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const addInstance: AddInstanceAction = {
      name: "nodejs-bot.generateCode",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok("scaffold nodejs bot source code");
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        console.log("scaffold nodejs bot source code");
        return ok(undefined);
      },
    };
    return ok(addInstance);
  }
  generateBicep(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    return ok({
      type: "call",
      required: true,
      targetAction: "azure-web-app.generateBicep",
    });
  }
}

@Service("nodejs-notification-bot")
export class DotnetBotResource implements AzureResourcePlugin {
  name = "nodejs-bot";
  addInstance(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const addInstance: AddInstanceAction = {
      name: "nodejs-notification-bot.addInstance",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok(
          "ensure entry 'azure-function', 'azure-bot' in projectSettings.solutionSettings.activeResourcePlugins"
        );
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        ensureSolutionSettings(context.projectSetting);
        if (
          !context.projectSetting.solutionSettings?.activeResourcePlugins.includes("azure-function")
        )
          context.projectSetting.solutionSettings?.activeResourcePlugins.push("azure-function");
        if (!context.projectSetting.solutionSettings?.activeResourcePlugins.includes("azure-bot"))
          context.projectSetting.solutionSettings?.activeResourcePlugins.push("azure-bot");
        return ok(undefined);
      },
    };
    return ok(addInstance);
  }
  generateCode(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const addInstance: AddInstanceAction = {
      name: "nodejs-notification-bot.generateCode",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok("scaffold nodejs notification bot source code");
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        console.log("scaffold nodejs notification bot source code");
        return ok(undefined);
      },
    };
    return ok(addInstance);
  }
  generateBicep(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    return ok({
      type: "call",
      required: true,
      targetAction: "azure-function.generateBicep",
    });
  }
}

@Service("teams-manifest")
export class TeamsManifestResource {
  name = "teams-manifest";
  init(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const init: AddInstanceAction = {
      name: "azure-bot.init",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok("init manifest template");
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        return ok(undefined);
      },
    };
    return ok(init);
  }
  addCapability(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const init: AddInstanceAction = {
      name: "azure-bot.addCapability",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok(`add capability in teams manifest: ${inputs["add-capability"]}`);
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        return ok(undefined);
      },
    };
    return ok(init);
  }
  provision(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const provision: ProvisionAction = {
      name: "azure-bot.provision",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok("provision teams manifest");
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: Inputs
      ): Promise<Result<undefined, FxError>> => {
        console.log(
          `provision teams manifest with tab:${inputs.tab.endpoint} and bot:${inputs["azure-bot"].botId}`
        );
        return ok(undefined);
      },
    };
    return ok(provision);
  }
}

@Service("fx")
export class TeamsfxCore {
  name = "fx";
  add(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath & { resources: string[] }
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const resources = inputs.resources;
    const actions: Action[] = [];
    resources.forEach((p) => {
      actions.push({
        type: "call",
        required: false,
        targetAction: `${p}.addInstance`,
      });
      actions.push({
        type: "call",
        required: false,
        targetAction: `${p}.generateCode`,
      });
      actions.push({
        type: "call",
        required: false,
        targetAction: `${p}.generateBicep`,
      });
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
        return ok("persist bicep files");
      },
      execute: async (context: v2.Context, inputs: Inputs) => {
        console.log("persist bicep files");
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
        return ok("deploy bicep");
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
        return ok("check common configs (account, resource group)");
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
    // provisionSequences.push({
    //   name: "fx.configure",
    //   type: "function",
    //   plan: (context: v2.Context, inputs: Inputs) => {
    //     return "configure after bicep deployment";
    //   },
    //   execute: async (context: any, inputs: Inputs) => {
    //     return ok(undefined);
    //   },
    // });
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
}

async function getAction(name: string, context: any, inputs: any) {
  const arr = name.split(".");
  const resourceName = arr[0];
  const actionName = arr[1];
  const resource = Container.get(resourceName) as any;
  if (resource[actionName]) {
    const res = await resource[actionName](context, inputs);
    if (res.isOk()) return res.value;
  }
  return undefined;
}

async function planAction(context: any, inputs: any, action: Action) {
  if (action.type === "function") {
    const planRes = await action.plan(context, inputs);
    if (planRes.isOk()) {
      console.log(`plan: ${action.name} - ${planRes.value}`);
    }
  } else if (action.type === "shell") {
    console.log("plan: shell " + action.command);
  } else if (action.type === "call") {
    const targetAction = await getAction(action.targetAction, context, inputs);
    if (action.required && !targetAction) {
      throw new Error("targetAction not exist: " + action.targetAction);
    }
    if (targetAction) {
      await planAction(context, inputs, targetAction);
    }
  } else {
    if (!action.actions) {
      console.log(action.actions);
    }
    for (const act of action.actions) {
      await planAction(context, inputs, act);
    }
  }
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

async function executeAction(context: any, inputs: any, action: Action) {
  if (action.type === "function") {
    console.log(`execute: ${action.name}`);
    await action.execute(context, inputs);
  } else if (action.type === "shell") {
    console.log("shell:" + action.command);
  } else if (action.type === "call") {
    const targetAction = await getAction(action.targetAction, context, inputs);
    if (action.required && !targetAction) {
      throw new Error("action not exist: " + action.targetAction);
    }
    if (targetAction) {
      if (action.inputs) {
        templateReplace(action.inputs, inputs);
      }
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

async function testProvision() {
  setTools(new MockTools());
  const projectSetting: ProjectSettings = {
    projectId: "12",
    appName: "huajie0316",
    solutionSettings: {
      name: "fx",
      activeResourcePlugins: ["aad", "azure-storage", "azure-web-app", "azure-bot"],
    },
  };
  const context = createV2Context(projectSetting);
  const inputs: v2.InputsWithProjectPath = {
    projectPath: "",
    platform: Platform.VSCode,
  };
  const core = Container.get("fx") as TeamsfxCore;
  const provisionActionRes = await core.provision(context, inputs);
  if (provisionActionRes.isOk()) {
    const action = provisionActionRes.value;
    if (action) {
      console.log(JSON.stringify(action));
      await planAction(context, inputs, action);
      await executeAction(context, inputs, action);
    }
    console.log(inputs);
  }
}
