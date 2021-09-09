// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result } from "neverthrow";
import { Inputs, ProjectConfig, Void } from "./types";
import { Func, FunctionRouter, QTreeNode } from "./qm";
import { FxError } from "./error";
import { Stage } from ".";

export interface Core {
  version?: string;
  createProject: (systemInputs: Inputs) => Promise<Result<string, FxError>>;
  provisionResources: (systemInputs: Inputs) => Promise<Result<Void, FxError>>;
  buildArtifacts: (systemInputs: Inputs) => Promise<Result<Void, FxError>>;
  deployArtifacts: (systemInputs: Inputs) => Promise<Result<Void, FxError>>;
  localDebug: (systemInputs: Inputs) => Promise<Result<Void, FxError>>;
  publishApplication: (systemInputs: Inputs) => Promise<Result<Void, FxError>>;
  executeUserTask: (func: Func, inputs: Inputs) => Promise<Result<unknown, FxError>>;

  createEnv: (systemInputs: Inputs) => Promise<Result<Void, FxError>>;
  removeEnv: (systemInputs: Inputs) => Promise<Result<Void, FxError>>;
  switchEnv: (systemInputs: Inputs) => Promise<Result<Void, FxError>>;

  activateEnv: (env: string, systemInput: Inputs) => Promise<Result<Void, FxError>>;

  /**
   * only for CLI
   */
  getQuestions: (task: Stage, inputs: Inputs) => Promise<Result<QTreeNode | undefined, FxError>>;
  getQuestionsForUserTask?: (
    router: FunctionRouter,
    inputs: Inputs
  ) => Promise<Result<QTreeNode | undefined, FxError>>;

  /**
   * Used for encryption of secrets in user data file
   */
  encrypt: (plaintext: string, inputs: Inputs) => Promise<Result<string, FxError>>;
  decrypt: (ciphertext: string, inputs: Inputs) => Promise<Result<string, FxError>>;

  migrateV1Project: (systemInputs: Inputs) => Promise<Result<string, FxError>>;
  /**
   * For grant and check permission in remote collaboration
   */
  grantPermission: (systemInputs: Inputs) => Promise<Result<any, FxError>>;
  checkPermission: (systemInputs: Inputs) => Promise<Result<any, FxError>>;
  listCollaborator: (systemInputs: Inputs) => Promise<Result<any, FxError>>;
}
