// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {HookContext, NextFunction, Middleware} from "@feathersjs/hooks";
import * as fs from "fs-extra";
import {ConfigFolderName, Stage} from "fx-api";

import {CoreContext} from "../context";
import {LaunchConfig} from "../launch";

/**
 * this middleware will load env from launch.json which is critical for subsequence flow.
 */
export const envMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
  for (const i in ctx.arguments) {
    if (ctx.arguments[i] instanceof CoreContext) {
      const coreCtx = ctx.arguments[i] as CoreContext;
      if (coreCtx.stage === Stage.create) {
        break;
      }

      const laungh: LaunchConfig = await fs.readJson(
        `${coreCtx.root}/.${ConfigFolderName}/launch.json`,
        {encoding: "utf-8"}
      );
      coreCtx.env = laungh.currentEnv;
      ctx.arguments[i] = coreCtx;
      break;
    }
  }

  await next();
};
