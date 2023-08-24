// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Middleware, NextFunction } from "@feathersjs/hooks";
import { Inputs, err } from "@microsoft/teamsfx-api";
import _ from "lodash";
import { environmentManager } from "../../core/environment";
import { NoProjectOpenedError } from "../../core/error";
import { TOOLS } from "../../core/globalVars";
import { CoreHookContext } from "../../core/types";
import { QuestionNames } from "../../question/questionNames";
import { selectTargetEnvQuestion } from "../../question/other";
import { traverse } from "../../ui/visitor";
import { envUtil } from "../utils/envUtil";

/**
 *
 * @param withLocalEnv whether include local env in env selection list
 * @param skipLoadIfNoEnvInput whether to ignore this middleware if input.env is not available
 * @returns
 */
export function EnvLoaderMW(withLocalEnv: boolean, skipLoadIfNoEnvInput = false): Middleware {
  return async (ctx: CoreHookContext, next: NextFunction) => {
    const envBefore = _.cloneDeep(process.env);
    try {
      await envLoaderMWImpl(withLocalEnv, ctx, next, skipLoadIfNoEnvInput);
      return;
    } finally {
      const keys = Object.keys(process.env);
      for (const k of keys) {
        if (!(k in envBefore)) {
          delete process.env[k];
        } else {
          process.env[k] = envBefore[k];
        }
      }
    }
  };
}

const envLoaderMWImpl = async (
  withLocalEnv: boolean,
  ctx: CoreHookContext,
  next: NextFunction,
  skipLoadIfNoEnvInput = false
) => {
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  const projectPath = inputs.projectPath;
  if (!projectPath) {
    ctx.result = err(new NoProjectOpenedError());
    return;
  }
  if (inputs.ignoreEnvInfo) {
    inputs.env = environmentManager.getDefaultEnvName();
  }
  if (!inputs.env) {
    if (skipLoadIfNoEnvInput) {
      await next();
      return;
    }
    const question = selectTargetEnvQuestion(QuestionNames.Env, !withLocalEnv, true);
    const res = await traverse({ data: question }, inputs, TOOLS.ui);
    if (res.isErr()) {
      TOOLS.logProvider.debug(`Failed to run question model for target environment.`);
      ctx.result = err(res.error);
      return;
    }
  }
  const res = await envUtil.readEnv(projectPath, inputs.env!);
  if (res.isErr()) {
    ctx.result = err(res.error);
    return;
  }
  ctx.envVars = res.value;
  await next();
};

export const EnvWriterMW: Middleware = async (ctx: CoreHookContext, next: NextFunction) => {
  await next();
  const inputs = ctx.arguments[0] as Inputs;
  const env = inputs.env;
  const projectPath = inputs.projectPath;
  const envVars = ctx.envVars;
  if (projectPath && env && envVars) {
    const res = await envUtil.writeEnv(projectPath, env, envVars);
    if (res.isErr()) {
      ctx.result = err(res.error);
      return;
    }
  }
};
