// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as fs from "fs-extra";
import * as path from "path";
import { NextFunction, Middleware } from "@feathersjs/hooks";
import {
  AzureSolutionSettings,
  ConfigFolderName,
  err,
  Inputs,
  StaticPlatforms,
} from "@microsoft/teamsfx-api";
import { WriteFileError } from "../error";
import { CoreHookContext, FxCore } from "..";
import { isMultiEnvEnabled } from "../../common";

/**
 * This middleware will help to persist project settings if necessary.
 */
export const ProjectSettingsWriterMW: Middleware = async (
  ctx: CoreHookContext,
  next: NextFunction
) => {
  try {
    await next();
  } finally {
    const lastArg = ctx.arguments[ctx.arguments.length - 1];
    const inputs: Inputs = lastArg === ctx ? ctx.arguments[ctx.arguments.length - 2] : lastArg;
    if (
      !inputs.projectPath ||
      inputs.ignoreConfigPersist === true ||
      StaticPlatforms.includes(inputs.platform)
    )
      return;
    const solutionContext = ctx.solutionContext;
    if (solutionContext === undefined) return;
    try {
      const confFolderPath = path.resolve(inputs.projectPath, `.${ConfigFolderName}`);
      const solutionSettings = solutionContext.projectSettings
        ?.solutionSettings as AzureSolutionSettings;
      if (!solutionSettings.activeResourcePlugins) solutionSettings.activeResourcePlugins = [];
      if (!solutionSettings.azureResources) solutionSettings.azureResources = [];
      let settingFile;
      if (isMultiEnvEnabled()) {
        const confFolderPathNew = path.resolve(confFolderPath, "configs");
        await fs.ensureDir(confFolderPathNew);
        settingFile = path.resolve(confFolderPathNew, "projectSettings.json");
      } else {
        settingFile = path.resolve(confFolderPath, "settings.json");
      }
      const core = ctx.self as FxCore;
      await fs.writeFile(settingFile, JSON.stringify(solutionContext.projectSettings, null, 4));
      core.tools.logProvider.debug(`[core] persist project setting file: ${settingFile}`);
    } catch (e) {
      ctx.res = err(WriteFileError(e));
    }
  }
};
