// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
 
import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks"; 
import { err, Inputs, Platform } from "@microsoft/teamsfx-api";
import { isValidProject } from "../../common/tools";
import { InvalidProjectError, NoProjectOpenedError } from "../error";

 
export const ProjectTypeCheckerMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  if(ctx.method !== "createProject" 
      && !ctx.method?.startsWith("getQuestions") 
      && !(ctx.method === "executeUserTask" && inputs.platform === Platform.VS)
    ){

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
