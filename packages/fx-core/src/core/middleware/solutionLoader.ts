// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import { CoreHookContext, isV2 } from "..";
import {
  getAllSolutionPlugins,
  getAllSolutionPluginsV2,
  getSolutionPluginByName,
  getSolutionPluginV2ByName,
} from "../SolutionPluginContainer";

export function SolutionLoaderMW(): Middleware {
  return async (ctx: CoreHookContext, next: NextFunction) => {
    if (ctx.projectSettings) {
      if (isV2()) {
        const solution = getSolutionPluginV2ByName(ctx.projectSettings.solutionSettings.name);
        ctx.solutionV2 = solution;
      } else {
        const solution = getSolutionPluginByName(ctx.projectSettings.solutionSettings.name);
        ctx.solution = solution;
      }
    } else {
      // run from zero, load a default solution
      if (isV2()) {
        const solution = getAllSolutionPluginsV2()[0];
        ctx.solutionV2 = solution;
      } else {
        const solution = getAllSolutionPlugins()[0];
        ctx.solution = solution;
      }
    }
    await next();
  };
}
