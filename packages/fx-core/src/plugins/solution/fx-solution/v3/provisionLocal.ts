import {
  err,
  FxError,
  Json,
  NotImplementedError,
  ok,
  QTreeNode,
  Result,
  TokenProvider,
  v2,
} from "@microsoft/teamsfx-api";

export async function getQuestionsForLocalProvision(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath,
  tokenProvider: TokenProvider,
  localSettings?: v2.DeepReadonly<Json>
): Promise<Result<QTreeNode | undefined, FxError>> {
  return ok(undefined);
}
export async function provisionLocalResources(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath,
  localSettings: Json,
  tokenProvider: TokenProvider
): Promise<Result<Json, FxError>> {
  return err(new NotImplementedError("Solution", "provisionLocalResources"));
}
