// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ok, Result } from "neverthrow";
import { v2, v3 } from "..";
import { Platform } from "../constants";
import { FxError } from "../error";
import { QTreeNode } from "../qm";
import { Inputs } from "../types";
import { TokenProvider } from "../utils";

export type MaybePromise<T> = T | Promise<T>;

/**
 * Action is the basic concept to finish some lifecycle operation (create, provision, deploy, ...)
 * Action can be named action or anonymous action: named actions can be called by other actions, anonymous actions can not be called by other actions
 * An action can have the following types:
 * 1. shell - execute a shell script
 * 2. call - call an existing action
 * 3. function - run a javascript function
 * 4. group - a group of actions that can be executed in parallel or in sequence
 */
export type Action = GroupAction | CallAction | FunctionAction | ShellAction;

/**
 * group action: group action make it possible to leverage multiple sub-actions to accomplishment more complex task
 */
export interface GroupAction {
  name?: string;
  type: "group";
  mode: "sequential" | "parallel";
  actions: Action[];
}

/**
 * shell action: execute a shell script
 */
export interface ShellAction {
  name?: string;
  type: "shell";
  description: string;
  command: string;
  cwd?: string;
  async?: boolean;
  captureStdout?: boolean;
  captureStderr?: boolean;
}

/**
 * call action: call an existing action (defined locally or in other package)
 */
export interface CallAction {
  name?: string;
  type: "call";
  required: boolean; // required=true, throw error of target action does not exist; required=false, ignore this step if target action does not exist.
  targetAction: string;
  inputs?: {
    [k: string]: string;
  };
}

/**
 * function action: run a javascript function call that can do any kinds of work
 */
export interface FunctionAction {
  name?: string;
  type: "function";
  plan(context: any, inputs: Inputs): MaybePromise<string>;
  /**
   * question is to define inputs of the task
   */
  question?: (context: any, inputs: Inputs) => MaybePromise<Result<QTreeNode | undefined, FxError>>;
  /**
   * function body is a function that takes some context and inputs as parameter
   */
  execute: (context: any, inputs: Inputs) => MaybePromise<Result<any, FxError>>;
}

/**
 * a resource defines a collection of actions
 */
export interface Resource {
  readonly name: string;
  readonly description?: string;
  actions: (context: any) => MaybePromise<Action[]>;
}

/**
 * common function actions used in the built-in plugins
 */
export interface GenerateCodeAction extends FunctionAction {
  question?: (
    context: v2.Context,
    inputs: Inputs
  ) => MaybePromise<Result<QTreeNode | undefined, FxError>>;
  execute: (context: v2.Context, inputs: Inputs) => MaybePromise<Result<undefined, FxError>>;
}

export interface GenerateBicepAction extends FunctionAction {
  question?: (
    context: v2.Context,
    inputs: Inputs
  ) => MaybePromise<Result<QTreeNode | undefined, FxError>>;
  execute: (
    context: v2.Context,
    inputs: Inputs
  ) => MaybePromise<Result<v3.BicepTemplate[], FxError>>;
}

export interface ProvisionAction extends FunctionAction {
  question?: (
    context: v2.Context,
    inputs: Inputs
  ) => MaybePromise<Result<QTreeNode | undefined, FxError>>;
  execute: (
    context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
    inputs: Inputs
  ) => MaybePromise<Result<undefined, FxError>>;
}

export interface ConfigureAction extends FunctionAction {
  question?: (
    context: v2.Context,
    inputs: Inputs
  ) => MaybePromise<Result<QTreeNode | undefined, FxError>>;
  execute: (
    context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
    inputs: Inputs
  ) => MaybePromise<Result<undefined, FxError>>;
}

export interface BuildAction extends FunctionAction {
  question?: (
    context: v2.Context,
    inputs: Inputs
  ) => MaybePromise<Result<QTreeNode | undefined, FxError>>;
  execute: (context: v2.Context, inputs: Inputs) => MaybePromise<Result<undefined, FxError>>;
}

export interface DeployAction extends FunctionAction {
  question?: (
    context: v2.Context,
    inputs: Inputs
  ) => MaybePromise<Result<QTreeNode | undefined, FxError>>;
  execute: (
    context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
    inputs: Inputs
  ) => MaybePromise<Result<undefined, FxError>>;
}

export class AADResource implements Resource {
  name = "aad";
  actions(context: any): Action[] {
    const provision: ProvisionAction = {
      name: "aad.provision",
      type: "function",
      plan: (context, inputs) => {
        inputs["aad.clientId"] = "mockClientId";
        inputs["aad.clientSecret"] = "mockSecret";
        return "create aad app registration";
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: Inputs
      ): Promise<Result<undefined, FxError>> => {
        inputs["aad.clientId"] = "mockClientId";
        inputs["aad.clientSecret"] = "mockSecret";
        return ok(undefined);
      },
    };
    const configure: ProvisionAction = {
      name: "aad.configure",
      type: "function",
      plan: (context, inputs) => {
        return "update aad app registration with redirectUrls";
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: Inputs
      ): Promise<Result<undefined, FxError>> => {
        return ok(undefined);
      },
    };
    return [provision, configure];
  }
}
export class AzureWebAppResource implements Resource {
  name = "azure-web-app";
  actions(context: any): Action[] {
    const provision: ProvisionAction = {
      name: "azure-web-app.provision",
      type: "function",
      plan: (context, inputs) => {
        return "deploy bicep for azure web app with appSettings";
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: Inputs
      ): Promise<Result<undefined, FxError>> => {
        inputs["webApp.endpoint"] = "mockEndpoint";
        return ok(undefined);
      },
    };
    return [provision];
  }
}
export class AzureBotServiceResource implements Resource {
  name = "azure-bot-service";
  actions(context: any): Action[] {
    const provision: ProvisionAction = {
      name: "azure-bot-service.provision",
      type: "function",
      plan: (context, inputs) => {
        return "create azure bot service";
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: Inputs
      ): Promise<Result<undefined, FxError>> => {
        return ok(undefined);
      },
    };
    return [provision];
  }
}

export class TeamsManifestResource implements Resource {
  name = "teams-manifest";
  async actions(context: any): Promise<Action[]> {
    const createOrReuse: GenerateCodeAction = {
      name: "teams-manifest.createOrReuse",
      type: "function",
      plan: (context, inputs) => {
        if (inputs["select-manifest"] === "create") {
          return "create a new manifest";
        } else {
          return `reuse existing manifest: ${inputs["select-manifest"]}`;
        }
      },
      question: async (context: v2.Context, inputs: Inputs) => {
        const node = new QTreeNode({
          type: "singleSelect",
          title: "Create a new manifest or use existing one",
          name: "select-manifest",
          staticOptions: ["using manifest:123", "create a new manifest"],
        });
        return ok(node);
      },
      execute: async (context: v2.Context, inputs: Inputs) => {
        return ok(undefined);
      },
    };
    const addCapability: GenerateCodeAction = {
      name: "teams-manifest.addCapability",
      type: "function",
      plan: (context, inputs) => {
        return `add capability in teams manifest: ${inputs["add-capability"]}`;
      },
      execute: async (context: v2.Context, inputs: Inputs) => {
        return ok(undefined);
      },
    };
    const provision: GenerateCodeAction = {
      name: "teams-manifest.provision",
      type: "function",
      plan: (context, inputs) => {
        return "provision teams manifest";
      },
      execute: async (context: v2.Context, inputs: Inputs) => {
        return ok(undefined);
      },
    };
    return [createOrReuse, addCapability, provision];
  }
}

/**
 * Teams bot provision steps:
 * 1. trigger aad.provision to create AAD app for SSO [optional]
 * 2. Feed AAD outputs as inputs of azure-web-app.provision [optional]
 * 3. trigger action of azure-web-app.provision to create Azure web app for the bot app [required]
 * 4. Feed the endpoint of the azure web app to aad.configure's inputs [optional]
 * 5. Feed bot endpoint output to the inputs of bot-service.provision [required]
 * 6. trigger aad.configure to update redirectUrls for the app registration [optional]
 * 7. trigger azure-bot-service.provision to create bot service [required]
 * 8. Feed bot id from azure-bot-service output to the inputs of the teams-manifest.provision  [required]
 * 9. trigger teams-manifest.provision to create the teams app [required]
 */

export class TeamsBotResource implements Resource {
  name = "teams-bot";
  async actions(context: any): Promise<Action[]> {
    const provision: Action = {
      name: "teams-bot.provision",
      type: "group",
      mode: "sequential",
      actions: [
        {
          type: "group",
          mode: "sequential",
          actions: [
            {
              type: "call",
              required: false,
              targetAction: "aad.provision",
            },
            {
              type: "call",
              required: true,
              targetAction: "azure-web-app.provision",
              inputs: {
                "webApp.appSettings.M365_CLIENT_ID": "aad.clientId",
                "webApp.appSettings.M365_CLIENT_SECRET": "aad.clientSecret",
              },
            },
          ],
        },
        {
          type: "group",
          mode: "parallel",
          actions: [
            {
              type: "group",
              mode: "sequential",
              actions: [
                {
                  type: "call",
                  required: true,
                  targetAction: "azure-bot-service.provision",
                  inputs: {
                    "bot.endpoint": "webApp.endpoint",
                  },
                },
                {
                  type: "call",
                  required: true,
                  targetAction: "teams-manifest.provision",
                  inputs: {
                    "manifest.botId": "bot.botId",
                  },
                },
              ],
            },
            {
              type: "group",
              mode: "sequential",
              actions: [
                {
                  type: "function",
                  plan: (context, inputs) => {
                    return `set aad redirect urls in inputs`;
                  },
                  execute: async (context: any, inputs: Inputs) => {
                    inputs["aad.redirectUrls"] = inputs["webApp.endpoint"];
                    return ok(undefined);
                  },
                },
                {
                  type: "call",
                  required: false,
                  targetAction: "aad.configure",
                },
              ],
            },
          ],
        },
      ],
    };
    return [provision];
  }
}

async function planAction(
  context: any,
  inputs: Inputs,
  action: Action,
  actions: Map<string, Action>
) {
  if (action.type === "function") {
    console.log("plan:" + (await action.plan(context, inputs)));
  } else if (action.type === "shell") {
    console.log("plan: shell " + action.command);
  } else if (action.type === "call") {
    const targetAction = actions.get(action.targetAction);
    if (action.required && !targetAction) {
      throw new Error("targetAction not exist: " + action.targetAction);
    }
    if (targetAction) {
      if (action.inputs) {
        for (const target of Object.keys(action.inputs)) {
          const source = action.inputs[target];
          inputs[target] = inputs[source];
        }
      }
      planAction(context, inputs, targetAction, actions);
    }
  } else {
    for (const act of action.actions) {
      planAction(context, inputs, act, actions);
    }
  }
}

async function executeAction(
  context: any,
  inputs: Inputs,
  action: Action,
  actions: Map<string, Action>
) {
  if (action.type === "function") {
    console.log("execute:" + action.name);
    await action.execute(context, inputs);
  } else if (action.type === "shell") {
    console.log("shell:" + action.command);
  } else if (action.type === "call") {
    const targetAction = actions.get(action.targetAction);
    if (action.required && !targetAction) {
      throw new Error("action not exist: " + action.targetAction);
    }
    if (targetAction) {
      if (action.inputs) {
        for (const target of Object.keys(action.inputs)) {
          const source = action.inputs[target];
          inputs[target] = inputs[source];
        }
      }
      await executeAction(context, inputs, targetAction, actions);
    }
  } else {
    for (const act of action.actions) {
      await executeAction(context, inputs, act, actions);
    }
  }
}

async function test() {
  const actionMap = new Map<string, Action>();
  const context = {
    appName: "huajie0316",
  };
  const resources = [
    new TeamsBotResource(),
    new AADResource(),
    new TeamsManifestResource(),
    new AzureBotServiceResource(),
    new AzureWebAppResource(),
  ];
  for (const resource of resources) {
    const actions = await resource.actions(context);
    actions.forEach((action) => {
      if (action.name) {
        actionMap.set(action.name, action);
      }
    });
  }
  const rootAction = actionMap.get("teams-bot.provision") as Action;
  console.log(JSON.stringify(rootAction));
  const inputs: Inputs = { platform: Platform.VSCode };
  await planAction(context, inputs, rootAction, actionMap);
  await executeAction(context, inputs, rootAction, actionMap);
}

test();
