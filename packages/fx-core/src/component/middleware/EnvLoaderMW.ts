// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { HookContext, Middleware, NextFunction } from "@feathersjs/hooks";
import { Inputs } from "@microsoft/teamsfx-api";
import { envUtil } from "../utils/envUtil";

export const EnvLoaderMW: Middleware = async (ctx: HookContext, next: NextFunction) => {
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  const env = inputs.env;
  const projectPath = inputs.projectPath;
  if (projectPath && env) {
    await envUtil.readEnv(projectPath, env);
    //TODO decrypt
  }
  await next();
};
