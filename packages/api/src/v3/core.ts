// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result } from "neverthrow";
import { Stage } from "../constants";
import { FxError } from "../error";
import { Func, FunctionRouter, QTreeNode } from "../qm/question";
import { Inputs, Void } from "../types";
import { InputsWithProjectPath } from "../v2/types";

export interface ICore {
  /**
   * init means enable TeamsFx feature for current project folder. There are two cases:
   * 1. Init in an empty folder
   * 2.	Init in existing project folder
   * Whether current folder is empty or not, core will create ".fx" folder and "templates" folder with necessary files, similar to what "git init" command do.
   */
  init: (inputs: InputsWithProjectPath & { solution?: string }) => Promise<Result<Void, FxError>>;
  /**
   * A module is a connection between the local code and cloud resource for deployment stage.
   * addModule only update project settings while add capability does more.
   */
  addModule: (
    inputs: InputsWithProjectPath & { capabilities?: string[] }
  ) => Promise<Result<Void, FxError>>;
  /**
   * scaffold will be an independent stage
   */
  scaffold: (inputs: InputsWithProjectPath) => Promise<Result<Void, FxError>>;
  /**
   * addResource is separated from executeUserTask
   */
  addResource: (inputs: InputsWithProjectPath) => Promise<Result<Void, FxError>>;
  /**
   * provision resources
   */
  provisionResources: (inputs: InputsWithProjectPath) => Promise<Result<Void, FxError>>;

  /**
   * deploy bits
   */
  deployArtifacts: (
    inputs: InputsWithProjectPath & { moduleIndex?: number }
  ) => Promise<Result<Void, FxError>>;

  /**
   * publish application
   */
  publishApplication: (inputs: InputsWithProjectPath) => Promise<Result<Void, FxError>>;

  /**
   * execute user customized task
   */
  executeUserTask: (func: Func, inputs: Inputs) => Promise<Result<unknown, FxError>>;

  /**
   * only for CLI
   */
  getQuestions: (task: Stage, inputs: Inputs) => Promise<Result<QTreeNode | undefined, FxError>>;
  getQuestionsForUserTask?: (
    router: FunctionRouter,
    inputs: Inputs
  ) => Promise<Result<QTreeNode | undefined, FxError>>;
}
