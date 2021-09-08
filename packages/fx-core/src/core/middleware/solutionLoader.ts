// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import { Solution, v2 } from "@microsoft/teamsfx-api";
import Container from "typedi";
import { CoreHookContext, isV2 } from "..";

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
    }
    await next();
  };
}
