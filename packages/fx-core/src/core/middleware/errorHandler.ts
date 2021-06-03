// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks"; 
import { assembleError, err, Inputs } from "@microsoft/teamsfx-api";
import { FxCore } from "..";

/**
 * in case there're some uncatched exceptions, this middleware will act as a guard
 * to catch exceptions and return specific error.
 */
export const ErrorHandlerMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
  const core = ctx.self as FxCore;
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  try {
    core.tools.logProvider.info(`[core] start task:${ctx.method}, inputs:${JSON.stringify(inputs)}`);
    await next();
    core.tools.logProvider.info(`[core] finish task:${ctx.method}`);
  } catch (e) {
    core.tools.logProvider.error(`[core] failed to run task:${ctx.method}`);
    ctx.result = err(assembleError(e));
  }
};
