// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import { err, FxError, Inputs, ok, ProjectSettings, Result, v2, v3 } from "@microsoft/teamsfx-api";
import { newEnvInfoV3 } from "../tools";
import { CoreHookContext } from "../..";
import { LocalCrypto } from "../crypto";
import { environmentManager } from "../environment";
import { NoProjectOpenedError, ProjectSettingsUndefinedError } from "../error";
import { getTargetEnvName } from "./envInfoLoader";
import { shouldIgnored } from "./projectSettingsLoader";

export function EnvInfoLoaderMW_V3(skip: boolean): Middleware {
  return async (ctx: CoreHookContext, next: NextFunction) => {
    if (shouldIgnored(ctx)) {
      await next();
      return;
    }

    const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
    if (!ctx.projectSettings) {
      ctx.result = err(ProjectSettingsUndefinedError());
      return;
    }

    if (!inputs.projectPath) {
      ctx.result = err(NoProjectOpenedError());
      return;
    }

    // make sure inputs.env always has value so telemetry can use it.
    const envRes = await getTargetEnvName(skip, inputs, ctx);
    if (envRes.isErr()) {
      ctx.result = err(envRes.error);
      return;
    }
    inputs.env = envRes.value;

    const result = await loadEnvInfoV3(
      inputs as v2.InputsWithProjectPath,
      ctx.projectSettings,
      inputs.env,
      skip || inputs.ignoreEnvInfo
    );
    if (result.isErr()) {
      ctx.result = err(result.error);
      return;
    }

    ctx.envInfoV3 = result.value;

    await next();
  };
}

async function loadEnvInfoV3(
  inputs: v2.InputsWithProjectPath,
  projectSettings: ProjectSettings,
  targetEnvName?: string,
  ignoreEnvInfo = false
): Promise<Result<v3.EnvInfoV3, FxError>> {
  const cryptoProvider = new LocalCrypto(projectSettings.projectId);

  let envInfo: v3.EnvInfoV3;
  // in pre-multi-env case, envInfo is always loaded.
  if (ignoreEnvInfo) {
    envInfo = newEnvInfoV3();
  } else {
    // ensure backwards compatibility:
    // project id will be generated for previous TeamsFx project.
    // Decrypting the secrets in *.userdata with generated project id works because secrets doesn't have prefix.
    const envDataResult = await environmentManager.loadEnvInfo(
      inputs.projectPath,
      cryptoProvider,
      targetEnvName,
      true
    );

    if (envDataResult.isErr()) {
      return err(envDataResult.error);
    }
    envInfo = envDataResult.value as v3.EnvInfoV3;
  }
  return ok(envInfo);
}
