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
  const logger = (core !== undefined && core.tools!== undefined && core.tools.logProvider!== undefined) ? core.tools.logProvider:undefined;
  try {
    if(logger)
      logger.info(`[core] start task:${ctx.method}, inputs:${JSON.stringify(inputs)}`);
    await next();
    if(logger)
      logger.info(`[core] finish task:${ctx.method}`);
  } catch (e) {
    ctx.result = err(assembleError(e));
  }
};
