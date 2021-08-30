// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
import { err, Inputs, ArchiveFolderName } from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import * as path from "path";
import { ArchiveFolderExistError, InvalidV1ProjectError, NoProjectOpenedError } from "../error";
import { validateV1Project } from "../tools";

export const MigrateConditionHandlerMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  if (!inputs.projectPath) {
    ctx.result = err(NoProjectOpenedError());
    return;
  }

  const errorMessage = await validateV1Project(inputs.projectPath);
  if (errorMessage) {
    ctx.result = err(InvalidV1ProjectError(errorMessage));
    return;
  }

  const archiveFolder = path.resolve(inputs.projectPath, ArchiveFolderName);
  if (await fs.pathExists(archiveFolder)) {
    ctx.result = err(ArchiveFolderExistError());
    return;
  }

  await next();
};
