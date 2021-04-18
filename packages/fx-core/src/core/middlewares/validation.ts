// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as fs from "fs-extra";
import * as path from "path";
import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
import { err, ConfigFolderName, Inputs } from "fx-api";
import { NotSupportedProjectType } from "../error";


/**
 * this middleware will help to check if current folder is supported or not.
 * if not supported, return a NotSupportedProjectType
 */
export const projectTypeCheckerMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
 
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  const projectPath = inputs.projectPath;
  // some validation
  const checklist: string[] = [
    projectPath,
    `${projectPath}/package.json`,
    `${projectPath}/.${ConfigFolderName}`,
    `${projectPath}/.${ConfigFolderName}/settings.json`
  ];
  for (const fp of checklist) {
    if (!(await fs.pathExists(path.resolve(fp)))) {
      ctx.result = err(NotSupportedProjectType());
      return;
    }
  }
  await next();
};
