// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
 
import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks"; 
import { err, Inputs, StaticPlatforms } from "@microsoft/teamsfx-api";
import { FxCore } from "..";
import { isValidProject } from "../../common/tools";
import { InvalidProjectError, NoProjectOpenedError } from "../error";

 
export const ProjectCheckerMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
  const core = (ctx.self as FxCore);
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  const ignoreCheck = inputs.ignoreTypeCheck === true || ctx.method === "createProject" || StaticPlatforms.includes(inputs.platform);
  if(ignoreCheck === false){
    const projectPath = inputs.projectPath;
    if(!projectPath) {
      ctx.result = err(NoProjectOpenedError());
      return;
    }
    if(!isValidProject(projectPath)){
      ctx.result = err(InvalidProjectError());
      return;
    }
    core.tools.logProvider.debug(`[core] project type checker pass: ${projectPath}`);
  }
  await next();
};
