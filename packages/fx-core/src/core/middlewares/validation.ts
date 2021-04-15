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
export const validationMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
  let coreCtx: CoreContext;

  for (const i in ctx.arguments) {
    if (ctx.arguments[i] instanceof CoreContext) {
      coreCtx = ctx.arguments[i];
      break;
    }
  }

  if (coreCtx! === undefined) {
    ctx.result = err(InternalError());
    return;
  }

  if (coreCtx.stage === Stage.create || coreCtx.platform === Platform.VS) {
    await next();
    return;
  }

  const p = coreCtx.root;

  // some validation
  const checklist: string[] = [
    p,
    `${p}/package.json`,
    `${p}/.${ConfigFolderName}`,
    `${p}/.${ConfigFolderName}/settings.json`,
  ];
  for (const fp of checklist) {
    if (!(await fs.pathExists(path.resolve(fp)))) {
      ctx.result = err(NotSupportedProjectType());
      return;
    }
  }

  await next();
};
