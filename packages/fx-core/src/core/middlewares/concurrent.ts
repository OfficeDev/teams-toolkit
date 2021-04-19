// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
import { err, ConfigFolderName } from "fx-api";
import { CoreContext } from "../context";
import { InProcessingError } from "../error";

/* eslint-disable @typescript-eslint/no-var-requires */
const lockfile = require("proper-lockfile");
/* eslint-enable  @typescript-eslint/no-var-requires */

/**
 * Currently, we can only run lifecycle in sequence. Return InProcessingError if one API
 * is called when another's in processing.
 */
export const concurrentMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
  const coreContext = ctx.arguments[0] as CoreContext;
  const lf = `${coreContext.projectPath}\\.${ConfigFolderName}`;
  await lockfile
    .lock(lf)
    .then(async () => {
      try{
        await next();
      }
      catch(e){
        ctx.result = err(e);
      }
      finally{
        lockfile.unlock(lf);
      }
    })
    .catch((e: Error) => {
      console.log(e);
      ctx.result = err(InProcessingError());
      return;
    });
};
