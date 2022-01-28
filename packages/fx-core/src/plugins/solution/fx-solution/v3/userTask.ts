// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  err,
  Func,
  FxError,
  Inputs,
  Json,
  NotImplementedError,
  ok,
  QTreeNode,
  Result,
  TokenProvider,
  v2,
  v3,
} from "@microsoft/teamsfx-api";

export async function getQuestionsForUserTask(
  ctx: v2.Context,
  inputs: Inputs,
  func: Func,
  tokenProvider: TokenProvider,
  envInfo?: v2.DeepReadonly<v3.EnvInfoV3Question>
): Promise<Result<QTreeNode | undefined, FxError>> {
  return ok(undefined);
}
export async function executeUserTask(
  ctx: v2.Context,
  inputs: Inputs,
  func: Func,
  tokenProvider: TokenProvider,
  envInfo?: v3.EnvInfoV3
): Promise<Result<unknown, FxError>> {
  return err(new NotImplementedError("Solution", "executeUserTask"));
}
