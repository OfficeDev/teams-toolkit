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

export async function scaffoldSourceCode(
  ctx: v2.Context,
  inputs: Inputs
): Promise<Result<Void, FxError>> {
  return ok(Void);
}

export async function generateResourceTemplate(
  ctx: v2.Context,
  inputs: Inputs
): Promise<Result<Json, FxError>> {
  return ok({});
}

export async function provisionResource(
  ctx: v2.Context,
  inputs: Inputs,
  envInfo: v2.EnvInfoV2,
  tokenProvider: TokenProvider
): Promise<v2.FxResult<v2.SolutionProvisionOutput, FxError>> {
  const res: v2.SolutionProvisionOutput = {};
  return new v2.FxSuccess(res);
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
  localSettings: Json,
  inputs: v2.InputsWithProjectPath & { module?: keyof Module }
): Promise<Result<Void, FxError>> {
  return ok(Void);
}

export async function addCapability(
  ctx: v2.Context,
  localSettings: Json,
  inputs: v2.InputsWithProjectPath & { module?: keyof Module }
): Promise<Result<Void, FxError>> {
  return ok(Void);
}
