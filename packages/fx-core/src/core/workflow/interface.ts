// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  Json,
  ProjectSettings,
  QTreeNode,
  Result,
  TokenProvider,
  v2,
  v3,
} from "@microsoft/teamsfx-api";
import { ArmTemplateResult } from "../../common/armInterface";

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
  name: string;
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
  envInfo?: v3.EnvInfoV3;
  tokenProvider?: TokenProvider;
  bicep?: {
    [k: string]: ArmTemplateResult;
  };
}

export interface ResourceOutput {
  key: string;
  bicepVariable?: string;
}

export interface ResourceOutputs {
  [k: string]: ResourceOutput;
}

export interface CloudResource {
  readonly name: string;
  readonly description?: string;
  readonly outputs: ResourceOutputs;
  readonly finalOutputKeys: string[];
  generateBicep?: (
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<Action | undefined, FxError>>;
  provision?: (
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<Action | undefined, FxError>>;
  configure?: (
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<Action | undefined, FxError>>;
  deploy?: (
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<Action | undefined, FxError>>;
}

export interface SourceCodeProvider {
  readonly name: string;
  readonly description?: string;
  generate: (
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<Action | undefined, FxError>>;
  build?: (
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<Action | undefined, FxError>>;
}

export interface TeamsBotInputs extends v2.InputsWithProjectPath {
  "teams-bot": {
    scenario: string;
    hostingResource: "azure-web-app" | "azure-function";
    folder?: string;
    deployType?: "folder" | "zip";
    language?: string;
  };
}

export interface TeamsTabInputs extends v2.InputsWithProjectPath {
  "teams-tab": {
    framework?: "react" | "vue" | "angular" | "none" | "spfx";
    hostingResource: "azure-web-app" | "azure-function" | "azure-storage" | "spfx";
    folder?: string;
    deployType?: "folder" | "zip";
    language?: string;
  };
}

export interface AddComponentsInputs extends v2.InputsWithProjectPath {
  fx: {
    components: Component[];
  };
}

export interface Component extends Json {
  name: string;
  hostingResource?: string;
  deployType?: "folder" | "zip";
  language?: string;
  folder?: string;
  build?: boolean;
  provision?: boolean;
  connections?: string[];
}

export interface ProjectSettingsV3 extends ProjectSettings {
  components: Component[];
}

export interface ProvisionBicep {
  /*
    Content of this property will be appended to templates/azure/provision.bicep
    */
  Orchestration?: string;
  /*
    Content of each modules will be appended to templates/azure/provision/${moduleFileName}.bicep
    */
  Modules?: { [moduleFileName: string]: string };
}

export interface ConfigurationBicep {
  /*
    Content of this property will be appended to templates/azure/config.bicep
    */
  Orchestration?: string;
  /*
    Content of this property override each templates/azure/teamsFx/${moduleFileName}.bicep file
    */
  Modules?: { [moduleFileName: string]: string };
}
export interface Bicep {
  Provision?: ProvisionBicep;
  Configuration?: ConfigurationBicep;
  /*
  The parameters will be merged to .fx/configs/azure.parameters.{env}.json
  All environments will be updated when you provides this parameter
  */
  Parameters?: Record<string, string>;
}
