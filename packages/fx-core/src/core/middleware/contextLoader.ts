// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
import * as error from "../error";
import { err, Inputs } from "@microsoft/teamsfx-api";
import { FxCore } from "../..";

 
export const ContextLoaderMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
  try {
    const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
    if(inputs.projectPath && ctx.method !== "createProject")
      (ctx.self as FxCore).loadSolutionContext(inputs);
    else 
    {
      delete inputs.projectPath;
      (ctx.self as FxCore).newSolutionContext(inputs);
    }  
  }
  catch(e) {
    ctx.result = err(error.CreateContextError);
    return ;
  }
  await next();
};
