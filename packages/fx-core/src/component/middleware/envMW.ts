// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { HookContext, Middleware, NextFunction } from "@feathersjs/hooks";
import { Inputs } from "@microsoft/teamsfx-api";
import { CoreHookContext } from "../../core/types";
import { envUtil } from "../utils/envUtil";

export const EnvLoaderMW: Middleware = async (ctx: HookContext, next: NextFunction) => {
  const inputs = ctx.arguments[0] as Inputs;
  const env = inputs.env;
  const projectPath = inputs.projectPath;
  if (projectPath && env) {
    await envUtil.readEnv(projectPath, env);
  }
  await next();
};

export const EnvWriterMW: Middleware = async (ctx: CoreHookContext, next: NextFunction) => {
  await next();
  const inputs = ctx.arguments[0] as Inputs;
  const env = inputs.env;
  const projectPath = inputs.projectPath;
  const envOutput = ctx.envOutput;
  if (projectPath && env && envOutput) {
    await envUtil.writeEnv(projectPath, env, envOutput);
  }
};
