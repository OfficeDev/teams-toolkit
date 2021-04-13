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
export const versionControlMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
  console.log("in versionControlMW");

  let coreCtx: CoreContext;
  let stage: Stage | undefined;

  for (const i in ctx.arguments) {
    if (ctx.arguments[i] instanceof CoreContext) {
      coreCtx = ctx.arguments[i];
      continue;
    }

    if (typeof ctx.arguments[i] === "string" && ctx.arguments[i] in Stage) {
      stage = ctx.arguments[i];
      continue;
    }
  }

  if (coreCtx! === undefined) {
    ctx.result = err(InternalError());
    return;
  }

  if (stage! === undefined) {
    stage = coreCtx.stage;
  }

  if ((!stage && stage !== Stage.create) || coreCtx.platform === Platform.VS) {
    const p = process.cwd();
    // some validation
    const checklist: string[] = [
      p,
      `${p}/package.json`,
      `${p}/.${ConfigFolderName}`,
      `${p}/.${ConfigFolderName}/settings.json`,
      `${p}/.${ConfigFolderName}/env.default.json`,
      `${p}/.${ConfigFolderName}/answers.json`,
    ];
    for (const fp of checklist) {
      if (!(await fs.pathExists(path.resolve(fp)))) {
        ctx.result = err(NotSupportedProjectType());
        return;
      }
    }
  }

  await next();
};
