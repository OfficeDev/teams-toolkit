// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, HookContext, NextFunction } from "@feathersjs/hooks/lib";
import { ActionContext, ErrorHandler } from "./types";

export function RunWithCatchErrorMW(stage: string, errorHanlder: ErrorHandler): Middleware {
  return async (ctx: HookContext, next: NextFunction) => {
    const actionContext = ctx.arguments[0] as ActionContext;
    actionContext.stage = stage;
    try {
      await next();
    } catch (error) {
      actionContext.progressBar?.end(false);
      const res = await errorHanlder(actionContext, error);
      ctx.result = res;
    }
  };
}
