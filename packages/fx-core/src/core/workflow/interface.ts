// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ok,
  Result,
  AzureSolutionSettings,
  Inputs,
  v2,
  v3,
  Platform,
  FxError,
  QTreeNode,
  TokenProvider,
  Json,
} from "@microsoft/teamsfx-api";
import * as Handlebars from "handlebars";
import { assign, merge } from "lodash";
import { Service } from "typedi";

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
  inputs?: Json;
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
    [k: string]: string;
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
  plan(context: any, inputs: any): MaybePromise<Result<string, FxError>>;
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

/**
 * a resource defines a collection of actions
 */
export interface AzureResourcePlugin {
  readonly name: string;
  readonly description?: string;
  addInstance: (
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<Action | undefined, FxError>>;
  generateCode?: (
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<Action | undefined, FxError>>;
  generateBicep?: (
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<Action | undefined, FxError>>;
  updateBicep?: (
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<Action | undefined, FxError>>;
  provision?: (
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<Action | undefined, FxError>>;
  configure?: (
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<Action | undefined, FxError>>;
}
/**
 * common function actions used in the built-in plugins
 */
export interface AddInstanceAction extends FunctionAction {
  plan(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<string, FxError>>;
  question?: (
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<QTreeNode | undefined, FxError>>;
  execute: (
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<undefined, FxError>>;
}
/**
 * common function actions used in the built-in plugins
 */
export interface GenerateCodeAction extends FunctionAction {
  plan(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<string, FxError>>;
  question?: (
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<QTreeNode | undefined, FxError>>;
  execute: (
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<undefined, FxError>>;
}

export interface GenerateBicepAction extends FunctionAction {
  plan(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<string, FxError>>;
  question?: (
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<QTreeNode | undefined, FxError>>;
  execute: (
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<v3.BicepTemplate[], FxError>>;
}

export interface ProvisionAction extends FunctionAction {
  plan(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<string, FxError>>;
  question?: (
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<QTreeNode | undefined, FxError>>;
  execute: (
    context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<undefined, FxError>>;
}

export interface ConfigureAction extends FunctionAction {
  plan(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<string, FxError>>;
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
  ): MaybePromise<Result<string, FxError>>;
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
  ) => MaybePromise<Result<string, FxError>>;
  question?: (
    context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<QTreeNode | undefined, FxError>>;
  execute: (
    context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
    inputs: v2.InputsWithProjectPath
  ) => MaybePromise<Result<undefined, FxError>>;
}
