// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import { Inputs } from "@microsoft/teamsfx-api";
import { CoreHookContext } from "..";
import { SolutionLoader } from "../loader";

export function SolutionLoaderMW(loader:SolutionLoader): Middleware { 
  return async (
    ctx: CoreHookContext,
    next: NextFunction
  ) => {
    const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
    const solution = await loader.loadSolution(inputs);
    ctx.solution = solution;
    await next();
  };
}