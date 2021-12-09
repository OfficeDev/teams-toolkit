import {
  TokenProvider,
  FxError,
  Inputs,
  Json,
  Result,
  v2,
  AppStudioTokenProvider,
  Void,
  ok,
} from "@microsoft/teamsfx-api";
import Module from "module";

export async function init(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath
): Promise<Result<Void, FxError>> {
  return ok(Void);
}

export async function scaffold(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath
): Promise<Result<Void, FxError>> {
  return ok(Void);
}

export async function generateResourceTemplate(
  ctx: v2.Context,
  inputs: Inputs
): Promise<Result<Json, FxError>> {
  return ok({});
}

export async function publishApplication(
  ctx: v2.Context,
  inputs: Inputs,
  envInfo: v2.EnvInfoV2,
  tokenProvider: AppStudioTokenProvider
): Promise<Result<Void, FxError>> {
  return ok(Void);
}

export async function addResource(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath & { module?: keyof Module }
): Promise<Result<Void, FxError>> {
  return ok(Void);
}

export async function addModule(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath & { module?: keyof Module }
): Promise<Result<Void, FxError>> {
  return ok(Void);
}
