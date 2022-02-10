// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { Middleware, NextFunction } from "@feathersjs/hooks";
import {
  AzureSolutionSettings,
  ConfigFolderName,
  err,
  FxError,
  InputConfigsFolderName,
  Inputs,
  ProjectSettingsFileName,
  Result,
  StaticPlatforms,
} from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import * as path from "path";
import { CoreHookContext, TOOLS } from "..";
import { WriteFileError } from "../error";
import { shouldIgnored } from "./projectSettingsLoader";

/**
 * This middleware will help to persist project settings if necessary.
 */
export const ProjectSettingsWriterMW: Middleware = async (
  ctx: CoreHookContext,
  next: NextFunction
) => {
  await next();
  if (!shouldIgnored(ctx)) {
    const lastArg = ctx.arguments[ctx.arguments.length - 1];
    const inputs: Inputs = lastArg === ctx ? ctx.arguments[ctx.arguments.length - 2] : lastArg;
    if (
      !inputs.projectPath ||
      inputs.ignoreConfigPersist === true ||
      StaticPlatforms.includes(inputs.platform)
    )
      return;
    const projectSettings = ctx.projectSettings;
    if (projectSettings === undefined) return;
    try {
      const confFolderPath = path.resolve(inputs.projectPath, `.${ConfigFolderName}`);
      const solutionSettings = projectSettings.solutionSettings;
      if (solutionSettings) {
        if (!solutionSettings.activeResourcePlugins) solutionSettings.activeResourcePlugins = [];
        if (!solutionSettings.azureResources) solutionSettings.azureResources = [];
      }
      const confFolderPathNew = path.resolve(confFolderPath, InputConfigsFolderName);
      await fs.ensureDir(confFolderPathNew);
      const settingFile = path.resolve(confFolderPathNew, ProjectSettingsFileName);
      await fs.writeFile(settingFile, JSON.stringify(projectSettings, null, 4));
      TOOLS?.logProvider.debug(`[core] persist project setting file: ${settingFile}`);
    } catch (e) {
      if ((ctx.result as Result<any, FxError>).isOk()) {
        ctx.result = err(WriteFileError(e));
      }
    }
  }
};
