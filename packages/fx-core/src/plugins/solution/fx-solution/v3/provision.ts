// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  err,
  FxError,
  NotImplementedError,
  ok,
  QTreeNode,
  Result,
  TokenProvider,
  v2,
  v3,
} from "@microsoft/teamsfx-api";

export async function getQuestionsForProvision(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath,
  envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
  tokenProvider: TokenProvider
): Promise<Result<QTreeNode | undefined, FxError>> {
  return ok(undefined);
}
export async function provisionResources(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath,
  envInfo: v3.EnvInfoV3,
  tokenProvider: TokenProvider
): Promise<Result<v3.EnvInfoV3, FxError>> {
  return err(new NotImplementedError("Solution", "provisionResources"));
}
