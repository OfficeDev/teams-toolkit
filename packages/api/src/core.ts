// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result } from "neverthrow";
import { Stage } from ".";
import { FxError } from "./error";
import { Func, FunctionRouter, QTreeNode } from "./qm";
import { Inputs, Void } from "./types";

export interface Core {
  version?: string;
  createProject: (inputs: Inputs) => Promise<Result<string, FxError>>;
  provisionResources: (inputs: Inputs) => Promise<Result<Void, FxError>>;
  buildArtifacts: (inputs: Inputs) => Promise<Result<Void, FxError>>;
  deployArtifacts: (inputs: Inputs) => Promise<Result<Void, FxError>>;
  localDebug: (inputs: Inputs) => Promise<Result<Void, FxError>>;
  publishApplication: (inputs: Inputs) => Promise<Result<Void, FxError>>;
  executeUserTask: (func: Func, inputs: Inputs) => Promise<Result<unknown, FxError>>;

  createEnv: (inputs: Inputs) => Promise<Result<Void, FxError>>;
  activateEnv: (inputs: Inputs) => Promise<Result<Void, FxError>>;

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

  migrateV1Project: (inputs: Inputs) => Promise<Result<string, FxError>>;
  /**
   * For grant and check permission in remote collaboration
   */
  grantPermission: (inputs: Inputs) => Promise<Result<any, FxError>>;
  checkPermission: (inputs: Inputs) => Promise<Result<any, FxError>>;
  listCollaborator: (inputs: Inputs) => Promise<Result<any, FxError>>;
}
