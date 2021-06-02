// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as fs from "fs-extra";
import * as path from "path";
import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
import { ConfigFolderName, err, Inputs, Platform, SolutionContext, StaticPlatforms } from "@microsoft/teamsfx-api";
import { mapToJson, serializeDict, sperateSecretData } from "../../common/tools";
import { WriteFileError } from "../error";
import { FxCore } from "..";

/**
 * This middleware will help to persist configs if necessary.
 */
export const ConfigWriterMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
  try {
    await next();
  }
  finally {
    const solutionContext: SolutionContext = ctx.arguments[0] as SolutionContext;
    const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
    const ignorePersist = solutionContext === undefined || inputs.projectPath === undefined || inputs.ignoreConfigPersist === true || StaticPlatforms.includes(inputs.platform);
    if (ignorePersist === false) {
      try {
        const confFolderPath = path.resolve(solutionContext.root, `.${ConfigFolderName}`);
        if(!solutionContext.projectSettings?.currentEnv)
          solutionContext.projectSettings!.currentEnv = "default";
        const envName = solutionContext.projectSettings?.currentEnv;
        const solutionConfig = solutionContext.config;
        const configJson = mapToJson(solutionConfig);
        const jsonFilePath = path.resolve(confFolderPath, `env.${envName}.json`);
        const localDataPath = path.resolve(confFolderPath, `${envName}.userdata`);
        const localData = sperateSecretData(configJson); 
        const settingPath = path.resolve(confFolderPath, "settings.json");
        await fs.writeFile(jsonFilePath, JSON.stringify(configJson, null, 4));
        await fs.writeFile(localDataPath, serializeDict(localData));
        await fs.writeFile(settingPath, JSON.stringify(solutionContext.projectSettings, null, 4));
        const core = ctx.self as FxCore;
        core.tools.logProvider.debug(`[core] persist config folder: ${confFolderPath}`);
      } catch (e) {
        ctx.res = err(WriteFileError(e));
      }
    }
  }
};
