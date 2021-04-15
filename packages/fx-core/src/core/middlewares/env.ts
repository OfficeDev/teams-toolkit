// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
import * as fs from "fs-extra";
import * as path from "path";
import { err, Stage, Platform, ConfigFolderName } from "fx-api";

import { NotSupportedProjectType, InternalError } from "../error";
import { CoreContext } from "../context";

/**
 * this middleware will help to check if current folder is supported or not.
 * if not supported, return a NotSupportedProjectType
 */
export const envMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
  for (const i in ctx.arguments) {
    if (ctx.arguments[i] instanceof CoreContext) {
      let coreCtx = ctx.arguments[i];
    }
  }
  await next();
};
