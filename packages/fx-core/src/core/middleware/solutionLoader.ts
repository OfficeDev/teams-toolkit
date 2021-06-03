// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { HookContext, Middleware, NextFunction } from "@feathersjs/hooks/lib";
import { Inputs, Solution } from "@microsoft/teamsfx-api";
import { TeamsAppSolution } from "../../plugins";
 

export const SolutionLoaderMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  const solution = await loadSolution(inputs);
  // const globalSolutions = await loadGlobalSolutions(inputs);
  ctx.solution = solution;
  // ctx.globalSolutions = globalSolutions;
  await next();
};

export async function loadSolution(inputs: Inputs):Promise<Solution>{
  return new TeamsAppSolution(); 
}

export async function loadGlobalSolutions(inputs: Inputs):Promise<Solution[]>{
  return [new TeamsAppSolution()]; 
}