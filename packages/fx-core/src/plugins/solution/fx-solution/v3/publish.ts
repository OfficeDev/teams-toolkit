// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AppStudioTokenProvider,
  FxError,
  Json,
  ok,
  QTreeNode,
  Result,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";

export async function getQuestionsForPublish(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath,
  envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
  tokenProvider: AppStudioTokenProvider
): Promise<Result<QTreeNode | undefined, FxError>> {
  return ok(undefined);
}
export async function publishApplication(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath,
  envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
  tokenProvider: AppStudioTokenProvider,
  telemetryProps?: Json
): Promise<Result<Void, FxError>> {
  return ok(Void);
}
