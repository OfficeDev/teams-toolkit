// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { Result } from "neverthrow";
import { SolutionContext } from "./context";
import { FxError } from "./error";
import { Func, QTreeNode } from "./qm";
import { Stage } from "./constants";

export interface Solution {
  name: string;

  create: (ctx: SolutionContext) => Promise<Result<any, FxError>>;

  scaffold: (ctx: SolutionContext) => Promise<Result<any, FxError>>;

  provision: (ctx: SolutionContext) => Promise<Result<any, FxError>>;

  deploy: (ctx: SolutionContext) => Promise<Result<any, FxError>>;

  publish: (ctx: SolutionContext) => Promise<Result<any, FxError>>;

  localDebug: (ctx: SolutionContext) => Promise<Result<any, FxError>>;

  getQuestions: (
    task: Stage,
    ctx: SolutionContext
  ) => Promise<Result<QTreeNode | undefined, FxError>>;

  getQuestionsForUserTask?: (
    func: Func,
    ctx: SolutionContext
  ) => Promise<Result<QTreeNode | undefined, FxError>>;

  executeUserTask?: (func: Func, ctx: SolutionContext) => Promise<Result<any, FxError>>;

  /**
   * For grant and check permission in remote collaboration
   */
  grantPermission?: (ctx: SolutionContext) => Promise<Result<any, FxError>>;

  checkPermission?: (ctx: SolutionContext) => Promise<Result<any, FxError>>;

  listCollaborator?: (ctx: SolutionContext) => Promise<Result<any, FxError>>;

  /**
   * for env management
   */
  createEnv?: (ctx: SolutionContext) => Promise<Result<any, FxError>>;
  activateEnv?: (ctx: SolutionContext) => Promise<Result<any, FxError>>;
}
