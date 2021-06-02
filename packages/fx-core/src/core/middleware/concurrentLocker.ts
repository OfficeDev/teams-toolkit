// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks"; 
import { ConfigFolderName, err, Inputs, Platform, StaticPlatforms } from "@microsoft/teamsfx-api";
import * as path from "path";
import { FxCore } from "..";
import { ConcurrentError } from "../error";

const lockfile = require("proper-lockfile"); 

export const ConcurrentLockerMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
  const core = ctx.self as FxCore;
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  const ignoreLock = !inputs || !inputs.projectPath || inputs.ignoreLock === true || StaticPlatforms.includes(inputs.platform); 
  if(ignoreLock === false){
    const lf = path.join(inputs.projectPath!,`.${ConfigFolderName}`);
    await lockfile
      .lock(lf)
      .then(async () => {
        core.tools.logProvider.debug(`[core] success to aquire lock on: ${lf}`);
        try{
          await next();
        }
        catch(e){
          ctx.result = err(e);
        }
        finally{
          lockfile.unlock(lf);
          core.tools.logProvider.debug(`[core] lock released on ${lf}`);
        }
      })
      .catch((e: Error) => {
        core.tools.logProvider.warning(`[core] failed to aquire lock on: ${lf}`);
        ctx.result = err(ConcurrentError);
        return;
      });
  }
  else {
    await next();
  }
};
