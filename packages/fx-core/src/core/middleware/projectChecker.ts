// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
 
import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks"; 
import { err, Inputs, Platform, StaticPlatforms } from "@microsoft/teamsfx-api";
import { isValidProject } from "../../common/tools";
import { InvalidProjectError, NoProjectOpenedError } from "../error";

 
export const ProjectCheckerMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  const ignoreCheck = inputs.ignoreTypeCheck === true || ctx.method === "createProject" || StaticPlatforms.includes(inputs.platform);
  if(ignoreCheck === false){
    const projectPath = inputs.projectPath;
    if(!projectPath) {
      ctx.result = err(NoProjectOpenedError);
      return;
    }
    if(!isValidProject(projectPath)){
      ctx.result = err(InvalidProjectError);
      return;
    }
  }
  await next();
};
