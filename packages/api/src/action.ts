// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result } from "neverthrow";
import { Bicep } from "./bicep";
import { FxError } from "./error";
import { QTreeNode } from "./qm/question";
import { Json, ContextV3, MaybePromise } from "./types";
import { InputsWithProjectPath } from "./v2/types";

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
  /**
   * execution mode, in sequence or in parallel, if undefined, default is sequential
   */
  mode?: "sequential" | "parallel";
  actions: Action[];
  inputs?: Json;
  /**
   * question is to define inputs of the task
   */
  question?: (
    context: ContextV3,
    inputs: InputsWithProjectPath
  ) => MaybePromise<Result<QTreeNode | undefined, FxError>>;
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
  inputs?: Json;
}

/**
 * function action: run a javascript function call that can do any kinds of work
 */
export interface FunctionAction {
  name: string;
  type: "function";
  inputs?: Json;
  plan?(context: ContextV3, inputs: InputsWithProjectPath): MaybePromise<Result<Effect[], FxError>>;
  /**
   * question is to define inputs of the task
   */
  question?: (
    context: ContextV3,
    inputs: InputsWithProjectPath
  ) => MaybePromise<Result<QTreeNode | undefined, FxError>>;
  /**
   * function body is a function that takes some context and inputs as parameter
   */
  execute: (
    context: ContextV3,
    inputs: InputsWithProjectPath
  ) => MaybePromise<Result<Effect[], FxError>>;
}

/**
 * create: create a new file if it does not exist; skip if it already exists
 * replace: create a new file if it does not exist; replace the file with new content if it already exists
 * append: create a new file with the content if it does not exist; append the content to the end of the file if it already exists
 * delete: delete the file if it exists; skip if it does not exist;
 */
export type FileOperation =
  | "create"
  | "replace"
  | "append"
  | "delete"
  | "skipCreate"
  | "skipReplace";

export interface FileEffect {
  type: "file";
  filePath: string | string[];
  operate: FileOperation;
  remarks?: string;
}

export interface CallServiceEffect {
  type: "service";
  name: string;
  remarks?: string;
  response?: string;
}

export type Effect = string | FileEffect | CallServiceEffect | Bicep | ShellAction;
