// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { Middleware, NextFunction } from "@feathersjs/hooks";
import {
  AzureSolutionSettings,
  ConfigFolderName,
  err,
  InputConfigsFolderName,
  Inputs,
  ProjectSettingsFileName,
  StaticPlatforms,
} from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import * as path from "path";
import { CoreHookContext, FxCore, isV2 } from "..";
import { isMultiEnvEnabled } from "../../common";
import { WriteFileError } from "../error";

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
    const projectSettings = isV2()
      ? ctx.contextV2?.projectSetting
      : ctx.solutionContext?.projectSettings;
    if (projectSettings === undefined) return;
    try {
      const confFolderPath = path.resolve(inputs.projectPath, `.${ConfigFolderName}`);
      const solutionSettings = projectSettings.solutionSettings as AzureSolutionSettings;
      if (!solutionSettings.activeResourcePlugins) solutionSettings.activeResourcePlugins = [];
      if (!solutionSettings.azureResources) solutionSettings.azureResources = [];
      let settingFile;
      if (isMultiEnvEnabled()) {
        const confFolderPathNew = path.resolve(confFolderPath, InputConfigsFolderName);
        await fs.ensureDir(confFolderPathNew);
        settingFile = path.resolve(confFolderPathNew, ProjectSettingsFileName);
      } else {
        settingFile = path.resolve(confFolderPath, "settings.json");
      }
      const core = ctx.self as FxCore;
      await fs.writeFile(settingFile, JSON.stringify(projectSettings, null, 4));
      core.tools.logProvider.debug(`[core] persist project setting file: ${settingFile}`);
    } catch (e) {
      ctx.res = err(WriteFileError(e));
    }
  }
};
