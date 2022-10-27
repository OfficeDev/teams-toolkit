// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { HookContext, Middleware, NextFunction } from "@feathersjs/hooks";
import { err, Inputs, QTreeNode, traverse, UserCancelError } from "@microsoft/teamsfx-api";
import { NoProjectOpenedError } from "../../core/error";
import { TOOLS } from "../../core/globalVars";
import { CoreHookContext } from "../../core/types";
import { SelectEnvQuestion } from "../question";
import { envUtil } from "../utils/envUtil";

export const EnvLoaderMW: Middleware = async (ctx: HookContext, next: NextFunction) => {
  const inputs = ctx.arguments[0] as Inputs;
  const projectPath = inputs.projectPath;
  if (!projectPath) {
    ctx.result = err(new NoProjectOpenedError());
    return;
  }
  if (!inputs.env) {
    const question = SelectEnvQuestion;
    const envListRes = await envUtil.listEnv(projectPath);
    if (envListRes.isErr()) {
      ctx.result = err(envListRes.error);
      return;
    }
    question.staticOptions = envListRes.value;
    const res = await traverse(new QTreeNode(question), inputs, TOOLS.ui);
    if (res.isErr()) {
      TOOLS.logProvider.debug(`[core:env] failed to run question model for target environment.`);
      ctx.result = err(res.error);
      return;
    }
    if (!inputs.env) {
      ctx.result = err(UserCancelError);
      return;
    }
  }
  await envUtil.readEnv(projectPath, inputs.env);
  await next();
};

export const EnvWriterMW: Middleware = async (ctx: CoreHookContext, next: NextFunction) => {
  await next();
  const inputs = ctx.arguments[0] as Inputs;
  const env = inputs.env;
  const projectPath = inputs.projectPath;
  const envVars = ctx.envVars;
  if (projectPath && env && envVars) {
    await envUtil.writeEnv(projectPath, env, envVars);
  }
};
