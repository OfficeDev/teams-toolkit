// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
import { CoreContext } from "../context";
import { DefaultSolution } from "../../plugins/solution/default";

/**
 * This middleware will help to load solutions dynamicly in the future.
 */
export const solutionMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
  const coreCtx = ctx.arguments[0] as CoreContext;
  coreCtx.solution = new DefaultSolution();
  await next();
};
