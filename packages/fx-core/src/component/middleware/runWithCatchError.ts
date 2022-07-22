// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, HookContext, NextFunction } from "@feathersjs/hooks/lib";
import { err, FxError, SystemError, UserError } from "@microsoft/teamsfx-api";
import { ErrorConstants } from "../constants";
import { ActionContext, AErrorHandler } from "./types";

export function RunWithCatchErrorMW(source: string, errorHanlder: AErrorHandler): Middleware {
  return async (ctx: HookContext, next: NextFunction) => {
    const actionContext = ctx.arguments[0] as ActionContext;
    actionContext.source = source;
    try {
      await next();
    } catch (error) {
      const res = errorHanlder(actionContext, error);
      ctx.result = err(res);
    }
  };
}

export const ActionErrorHandler: (ctx: ActionContext, error: any) => FxError = (
  ctx: ActionContext,
  error: any
) => {
  if (error instanceof SystemError || error instanceof UserError) {
    return error;
  } else {
    if (!(error instanceof Error)) {
      error = new Error(error.toString());
    }
    ctx.logger?.error(error.message);
    const wrapError = new SystemError({
      error,
      source: ctx.source,
      name: ErrorConstants.unhandledError,
      message: ErrorConstants.unhandledErrorMessage,
      displayMessage: ErrorConstants.unhandledErrorMessage,
    });
    return wrapError;
  }
};
