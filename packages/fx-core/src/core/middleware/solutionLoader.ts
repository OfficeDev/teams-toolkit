// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { NextFunction } from "@feathersjs/hooks/lib";
import { CoreHookContext } from "..";
import {
  getAllSolutionPlugins,
  getAllSolutionPluginsV2,
  getSolutionPluginByName,
  getSolutionPluginV2ByName,
} from "../SolutionPluginContainer";

export async function SolutionLoaderMW(ctx: CoreHookContext, next: NextFunction) {
  const solutionName = ctx.projectSettings?.solutionSettings?.name;
  if (solutionName) {
    {
      const solution = getSolutionPluginV2ByName(solutionName);
      ctx.solutionV2 = solution;
    }
    {
      const solution = getSolutionPluginByName(solutionName);
      ctx.solution = solution;
    }
  } else {
    // run from zero, load a default solution
    {
      const solution = getAllSolutionPluginsV2()[0];
      ctx.solutionV2 = solution;
    }
    {
      const solution = getAllSolutionPlugins()[0];
      ctx.solution = solution;
    }
  }
  await next();
}
