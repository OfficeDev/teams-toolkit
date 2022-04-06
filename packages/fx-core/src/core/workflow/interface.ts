// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  Json,
  ok,
  ProjectSettings,
  QTreeNode,
  Result,
  TokenProvider,
  v2,
  v3,
} from "@microsoft/teamsfx-api";

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
export enum ActionPriority {
  P0 = 0,
  P1 = 1,
  P2 = 2,
  P3 = 3,
  P4 = 4,
  P5 = 5,
  P6 = 6,
}
/**
 * group action: group action make it possible to leverage multiple sub-actions to accomplishment more complex task
 */
export interface GroupAction {
  name?: string;
  type: "group";
  /**
   * execution mode, in sequence or in parallel, if undefined, default is sequential
   */
  mode?: "sequential" | "parallel";
  actions: Action[];
  inputs?: any;
  /**
   * execution priority in a sequential group, default is 3
   */
  priority?: ActionPriority;
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
  /**
   * execution priority in a sequential group, default is 3
   */
  priority?: ActionPriority;
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
    [k: string]: any;
  };
  /**
   * execution priority in a sequential group, default is 3
   */
  priority?: ActionPriority;
}

/**
 * function action: run a javascript function call that can do any kinds of work
 */
export interface FunctionAction {
  name?: string;
  type: "function";
  inputs?: {
    [k: string]: any;
  };
  plan(context: any, inputs: any): MaybePromise<Result<string[], FxError>>;
  /**
   * question is to define inputs of the task
   */
  question?: (context: any, inputs: any) => MaybePromise<Result<QTreeNode | undefined, FxError>>;
  /**
   * function body is a function that takes some context and inputs as parameter
   */
  execute: (context: any, inputs: any) => MaybePromise<Result<any, FxError>>;
  /**
   * execution priority in a sequential group, default is 3
   */
  priority?: ActionPriority;
}

export interface ContextV3 extends v2.Context {
  manifestProvider: v3.AppManifestProvider;
  projectSetting: ProjectSettingsV3;
}

export interface AzureResource {
  readonly name: string;
  readonly type: "azure";
  readonly description?: string;
  generateBicep?: (
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<Action | undefined, FxError>>;
  updateBicep?: (
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<Action | undefined, FxError>>;
  provision?: (
    context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<Action | undefined, FxError>>;
  configure?: (
    context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<Action | undefined, FxError>>;
  deploy?: (
    context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<Action | undefined, FxError>>;
}

export interface ScaffoldResource {
  readonly name: string;
  readonly type: "scaffold";
  readonly description?: string;
  generateCode: (
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<Action | undefined, FxError>>;
  build?: (
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<Action | undefined, FxError>>;
}

export interface Resource {
  readonly name: string;
  readonly description?: string;
  add: (
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<Action | undefined, FxError>>;
  update?: (
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<Action | undefined, FxError>>;
}

export interface GenerateCodeAction extends FunctionAction {
  plan(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<string[], FxError>>;
  question?: (
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<QTreeNode | undefined, FxError>>;
  execute: (
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<undefined, FxError>>;
}

export interface GenerateBicepAction extends FunctionAction {
  plan(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<string[], FxError>>;
  question?: (
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<QTreeNode | undefined, FxError>>;
  execute: (
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<undefined, FxError>>;
}

export interface ProvisionAction extends FunctionAction {
  plan(
    context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<string[], FxError>>;
  question?: (
    context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<QTreeNode | undefined, FxError>>;
  execute: (
    context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<undefined, FxError>>;
}

export interface ConfigureAction extends FunctionAction {
  plan(
    context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<string[], FxError>>;
  question?: (
    context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<QTreeNode | undefined, FxError>>;
  execute: (
    context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<undefined, FxError>>;
}

export interface BuildAction extends FunctionAction {
  plan(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<string[], FxError>>;
  question?: (
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<QTreeNode | undefined, FxError>>;
  execute: (
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<undefined, FxError>>;
}

export interface DeployAction extends FunctionAction {
  plan: (
    context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<string[], FxError>>;
  question?: (
    context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<QTreeNode | undefined, FxError>>;
  execute: (
    context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<undefined, FxError>>;
}

export interface TeamsBotInputs extends v2.InputsWithProjectPath {
  "teams-bot": {
    scenarios: ("notification" | "commandAndResponse" | "messageExtension" | "default")[];
    hostingResource: "azure-web-app" | "azure-function";
    folder?: string;
    deployType?: "folder" | "zip";
    language?: "csharp" | "javascript" | "typescript";
  };
}

export interface TeamsTabInputs extends v2.InputsWithProjectPath {
  "teams-tab": {
    framework?: "react" | "vue" | "angular" | "none" | "spfx";
    hostingResource: "azure-web-app" | "azure-function" | "azure-storage" | "spfx";
    folder?: string;
    deployType?: "folder" | "zip";
    language?: "csharp" | "javascript" | "typescript";
  };
}

export interface AddResourceInputs extends v2.InputsWithProjectPath {
  fx: {
    resources: ResourceConfig[];
  };
}

export interface ResourceConfig extends Json {
  name: string;
  /**
   * support build operation, deployable
   */
  build?: boolean;
  /**
   * resource support provision
   */
  provision?: boolean;
  /**
   * for deployable resource, which cloud resource can host it
   */
  hostingResource?: string;
  deployType?: "folder" | "zip";
  language?: "csharp" | "javascript" | "typescript";
  folder?: string;
}

export interface ProjectSettingsV3 extends ProjectSettings {
  resources: ResourceConfig[];
}
