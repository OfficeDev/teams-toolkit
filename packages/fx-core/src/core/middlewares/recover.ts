// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
import { err, SystemError, UserError } from "fx-api";
import { UncatchedError } from "../error";

/**
 * in case there're some uncatched exceptions, this middleware will act as a guard
 * to catch exceptions and return specific error.
 */
export const recoverMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
  try {
    await next();
  } catch (e) {
    if (  e instanceof UserError || e instanceof SystemError) {
      ctx.result = err(e);
    }
    else {
      ctx.result = err(UncatchedError());
    }
  }
};
