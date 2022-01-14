// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { HookContext, Middleware, NextFunction } from "@feathersjs/hooks";
import { assembleError, err, FxError, Result } from "@microsoft/teamsfx-api";

export interface ErrorHandleOption {
  error?: FxError;
  startFn?: (ctx: HookContext) => Promise<Result<any, FxError>>;
  endFn?: (ctx: HookContext) => Promise<Result<any, FxError>>;
}

export function CommonErrorHandlerMW(option?: ErrorHandleOption): Middleware {
  return async (ctx: HookContext, next: NextFunction) => {
    try {
      if (option?.startFn) {
        await option?.startFn(ctx);
      }
      await next();
      if (option?.endFn) {
        await option?.endFn(ctx);
      }
    } catch (e) {
      const error = option?.error ? option.error : assembleError(e);
      ctx.error = error;
      if (option?.endFn) {
        await option?.endFn(ctx);
      }
      ctx.result = err(error);
    }
  };
}
