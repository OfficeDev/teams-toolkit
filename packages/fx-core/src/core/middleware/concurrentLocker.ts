// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks"; 
import { assembleError, ConfigFolderName, err, Inputs, Platform, StaticPlatforms, SystemError, UserError } from "@microsoft/teamsfx-api";
import * as path from "path";
import * as fs from "fs-extra";
import { FxCore } from "..";
import { ConcurrentError, InvalidProjectError, NoProjectOpenedError, PathNotExistError } from "../error";

const lockfile = require("proper-lockfile"); 

export const ConcurrentLockerMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
  const core = ctx.self as FxCore;
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  const ignoreLock = inputs.ignoreLock === true || StaticPlatforms.includes(inputs.platform); 
  if(ignoreLock === false){
    if(!inputs.projectPath){
      ctx.result = err(NoProjectOpenedError());
      return ;
    }
    if(!await fs.pathExists(inputs.projectPath)) {
      ctx.result = err(PathNotExistError(inputs.projectPath));
      return ;
    }
    const lf = path.join(inputs.projectPath!,`.${ConfigFolderName}`);
    if(!await fs.pathExists(lf)) {
      ctx.result = err(InvalidProjectError());
      return ;
    }
    await lockfile
      .lock(lf)
      .then(async () => {
        core.tools.logProvider.debug(`[core] success to aquire lock on: ${lf}`);
        try{
          await next();
        }
        catch(e){
          ctx.result = err(assembleError(e));
          return ;
        }
        finally{
          lockfile.unlock(lf);
          core.tools.logProvider.debug(`[core] lock released on ${lf}`);
        }
      })
      .catch((e:any) => {
        if(e["code"] === "ELOCKED"){
          core.tools.logProvider.warning(`[core] failed to aquire lock on: ${lf}`);
          ctx.result = err(ConcurrentError());
          return;
        }
        throw e;
      });
  }
  else {
    await next();
  }
};
