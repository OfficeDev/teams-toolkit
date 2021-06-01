// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
import { FxCore} from "../..";
import { TeamsAppSolution } from "../../plugins";

export const SolutionLoaderMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
  const core = ctx.self as FxCore;
  core.solution = new TeamsAppSolution();
  await next();
};
 