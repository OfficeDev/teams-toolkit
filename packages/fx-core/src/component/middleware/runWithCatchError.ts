// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, HookContext, NextFunction } from "@feathersjs/hooks/lib";
import { ActionContext, ErrorHanlder } from "./types";

export function RunWithCatchErrorMW(stage: string, errorHanlder: ErrorHanlder): Middleware {
  return async (ctx: HookContext, next: NextFunction) => {
    const actionContext = ctx.arguments[0] as ActionContext;
    actionContext.stage = stage;
    try {
      await next();
    } catch (error) {
      if (actionContext.progressBar) {
        actionContext.progressBar.end(false);
      }
      const res = await errorHanlder(actionContext, error);
      ctx.result = res;
    }
  };
}
