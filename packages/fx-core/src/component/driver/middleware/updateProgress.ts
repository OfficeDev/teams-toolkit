// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ning Tang <ning.tang@microsoft.com>
 */

import { Middleware, HookContext, NextFunction } from "@feathersjs/hooks/lib";
import { WrapDriverContext } from "../util/wrapUtil";

export function updateProgress(eventName: string): Middleware {
  return async (ctx: HookContext, next: NextFunction) => {
    const driverContext = ctx.arguments[1] as WrapDriverContext;
    await driverContext.progressBar?.next(eventName);
    await next();
  };
}
