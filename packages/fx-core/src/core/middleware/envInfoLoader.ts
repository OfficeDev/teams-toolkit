// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  err,
  FxError,
  Inputs,
  ok,
  ProjectSettings,
  Result,
  SolutionConfig,
  SolutionContext,
  Tools,
} from "@microsoft/teamsfx-api";
import { CoreHookContext, FxCore } from "../..";
import { NoProjectOpenedError } from "../error";
import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import { LocalCrypto } from "../crypto";
import { environmentManager } from "../environment";
import { GLOBAL_CONFIG, PROGRAMMING_LANGUAGE } from "../../plugins/solution/fx-solution/constants";

export const EnvInfoLoaderMW: Middleware = async (ctx: CoreHookContext, next: NextFunction) => {
  if (ctx.projectSettings) {
    const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
    const core = ctx.self as FxCore;

    const result = await loadSolutionContext(
      core.tools,
      inputs,
      ctx.projectSettings,
      ctx.projectIdMissing
    );
    if (result.isErr()) {
      ctx.result = err(result.error);
      return;
    }

    ctx.solutionContext = result.value;
  }

  await next();
};

export async function loadSolutionContext(
  tools: Tools,
  inputs: Inputs,
  projectSettings: ProjectSettings,
  projectIdMissing?: boolean
): Promise<Result<SolutionContext, FxError>> {
  if (!inputs.projectPath) {
    return err(NoProjectOpenedError());
  }

  // TODO: ask user input for the target environment name with question model.
  const targetEnvName = inputs.targetEnvName ?? environmentManager.defaultEnvName;
  const cryptoProvider = new LocalCrypto(projectSettings.projectId);
  // ensure backwards compatibility:
  // no need to decrypt the secrets in *.userdata for previous TeamsFx project, which has no project id.
  const envDataResult = await environmentManager.loadEnvProfile(
    inputs.projectPath,
    targetEnvName,
    projectIdMissing ? undefined : cryptoProvider
  );

  if (envDataResult.isErr()) {
    return err(envDataResult.error);
  }
  const envInfo = envDataResult.value;

  // upgrade programmingLanguange if exists.
  const solutionConfig = envInfo.data as SolutionConfig;
  const programmingLanguage = solutionConfig.get(GLOBAL_CONFIG)?.get(PROGRAMMING_LANGUAGE);
  if (programmingLanguage) {
    // add programmingLanguage in project settings
    projectSettings.programmingLanguage = programmingLanguage;

    // remove programmingLanguage in solution config
    solutionConfig.get(GLOBAL_CONFIG)?.delete(PROGRAMMING_LANGUAGE);
  }

  const solutionContext: SolutionContext = {
    projectSettings: projectSettings,
    targetEnvName: envInfo.envName,
    config: envInfo.data,
    root: inputs.projectPath || "",
    ...tools,
    ...tools.tokenProvider,
    answers: inputs,
    cryptoProvider: cryptoProvider,
  };

  return ok(solutionContext);
}
