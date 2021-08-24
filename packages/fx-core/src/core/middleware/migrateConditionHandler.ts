// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
import { ConfigFolderName } from "@microsoft/teamsfx-api";
import { err, Inputs, ArchiveFolderName } from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import * as path from "path";
import { ArchiveFolderExistError, InvalidV1ProjectError, NoProjectOpenedError } from "../error";
import { validateV1PackageSettings } from "../tools";

export const MigrateConditionHandlerMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  if (!inputs.projectPath) {
    ctx.result = err(NoProjectOpenedError());
    return;
  }

  const archiveFolder = path.resolve(inputs.projectPath, ArchiveFolderName);
  if (await fs.pathExists(archiveFolder)) {
    ctx.result = err(ArchiveFolderExistError());
    return;
  }

  const v2ConfigFolder = path.resolve(inputs.projectPath, `.${ConfigFolderName}`);
  if (await fs.pathExists(v2ConfigFolder)) {
    ctx.result = err(InvalidV1ProjectError(`Folder '.${ConfigFolderName}' already exists.`));
    return;
  }

  const packageJsonPath = path.resolve(inputs.projectPath, "package.json");
  try {
    const packageSettings = await fs.readJson(packageJsonPath);
    const validV1Project = validateV1PackageSettings(packageSettings);
    if (!validV1Project) {
      ctx.result = err(
        InvalidV1ProjectError("Teams Toolkit V1 settings cannot be found in 'package.json'.")
      );
      return;
    }
  } catch (error: any) {
    ctx.result = err(InvalidV1ProjectError(error?.message));
    return;
  }

  await next();
};
