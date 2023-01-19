// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { Middleware, NextFunction } from "@feathersjs/hooks";
import {
  err,
  FxError,
  Inputs,
  ProjectSettingsV3,
  Result,
  Settings,
  StaticPlatforms,
} from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import { isV3Enabled } from "../../common/tools";
import { convertProjectSettingsV3ToV2 } from "../../component/migrate";
import { WriteFileError } from "../error";
import { TOOLS } from "../globalVars";
import { CoreHookContext } from "../types";
import { getProjectSettingsPath, shouldIgnored } from "./projectSettingsLoader";

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
    let projectSettings = ctx.projectSettings;
    if (projectSettings === undefined) return;
    try {
      if (!isV3Enabled()) {
        projectSettings = convertProjectSettingsV3ToV2(projectSettings as ProjectSettingsV3);
        const solutionSettings = projectSettings.solutionSettings;
        if (solutionSettings) {
          if (!solutionSettings.activeResourcePlugins) solutionSettings.activeResourcePlugins = [];
          if (!solutionSettings.azureResources) solutionSettings.azureResources = [];
        }

        const settingFile = getProjectSettingsPath(inputs.projectPath);
        await fs.writeFile(settingFile, JSON.stringify(projectSettings, null, 4));
        TOOLS?.logProvider.debug(`[core] persist project setting file: ${settingFile}`);
      }
    } catch (e) {
      if ((ctx.result as Result<any, FxError>).isOk()) {
        ctx.result = err(WriteFileError(e));
      }
    }
  }
};
