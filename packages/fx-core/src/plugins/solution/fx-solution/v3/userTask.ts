// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  err,
  Func,
  FxError,
  Inputs,
  NotImplementedError,
  ok,
  QTreeNode,
  Result,
  TokenProvider,
  v2,
  v3,
} from "@microsoft/teamsfx-api";
import { getQuestionsForAddCapability, getQuestionsForAddResource } from "../v2/getQuestions";

export async function getQuestionsForUserTask(
  ctx: v2.Context,
  inputs: Inputs,
  func: Func,
  envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
  tokenProvider: TokenProvider
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (func.method === "addCapability") {
    return await getQuestionsForAddCapability(ctx, inputs);
  }
  if (func.method === "addResource") {
    return await getQuestionsForAddResource(ctx, inputs, func, envInfo, tokenProvider);
  }
  return ok(undefined);
}
export async function executeUserTask(
  ctx: v2.Context,
  inputs: Inputs,
  func: Func,
  envInfo: v3.EnvInfoV3,
  tokenProvider: TokenProvider
): Promise<Result<unknown, FxError>> {
  return err(new NotImplementedError("Solution", "executeUserTask"));
}
