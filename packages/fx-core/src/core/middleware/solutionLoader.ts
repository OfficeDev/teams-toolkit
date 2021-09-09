// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import { Solution, v2 } from "@microsoft/teamsfx-api";
import Container from "typedi";
import { CoreHookContext, isV2 } from "..";
import { getAllSolutionPlugins, getAllSolutionPluginsV2 } from "../SolutionPluginContainer";

export function SolutionLoaderMW(): Middleware {
  return async (ctx: CoreHookContext, next: NextFunction) => {
    if (ctx.projectSettings) {
      if (isV2()) {
        const solution = Container.get<v2.SolutionPlugin>(
          ctx.projectSettings.solutionSettings.name
        );
        ctx.solutionV2 = solution;
      } else {
        const solution = Container.get<Solution>(ctx.projectSettings.solutionSettings.name);
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
