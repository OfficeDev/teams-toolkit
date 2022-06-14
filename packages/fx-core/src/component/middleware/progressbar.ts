// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, HookContext, NextFunction } from "@feathersjs/hooks/lib";
import { ActionContext } from "./types";
export function ProgressBarMW(progressTitle: string, processStep: number): Middleware {
  return async (ctx: HookContext, next: NextFunction) => {
    const actionContext = ctx.arguments[0] as ActionContext;
    actionContext.progressBar = actionContext.userInteraction.createProgressBar(
      progressTitle,
      processStep
    );
    actionContext.progressBar.start();
    try {
      await next();
    } catch (error) {
      actionContext.progressBar.end(false);
      throw error;
    }
    actionContext.progressBar.end(true);
  };
}
