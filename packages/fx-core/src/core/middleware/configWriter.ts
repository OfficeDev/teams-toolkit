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
  SolutionContext,
  StaticPlatforms,
} from "@microsoft/teamsfx-api";
import {
  mapToJson,
  serializeDict,
  sperateSecretData,
  dataNeedEncryption,
} from "../../common/tools";
import { WriteFileError } from "../error";
import { CoreHookContext, FxCore } from "..";

/**
 * This middleware will help to persist configs if necessary.
 */
export const ConfigWriterMW: Middleware = async (ctx: CoreHookContext, next: NextFunction) => {
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
      if (!solutionContext.projectSettings?.currentEnv)
        solutionContext.projectSettings!.currentEnv = "default";
      const solutionSettings = solutionContext.projectSettings
        ?.solutionSettings as AzureSolutionSettings;
      if (!solutionSettings.activeResourcePlugins) solutionSettings.activeResourcePlugins = [];
      if (!solutionSettings.azureResources) solutionSettings.azureResources = [];
      const envName = solutionContext.projectSettings?.currentEnv;
      const solutionConfig = solutionContext.config;
      const configJson = mapToJson(solutionConfig);
      const envJsonFile = path.resolve(confFolderPath, `env.${envName}.json`);
      const userDataFile = path.resolve(confFolderPath, `${envName}.userdata`);
      const localData = sperateSecretData(configJson);
      if (solutionContext.cryptoProvider) {
        for (const secretKey of Object.keys(localData)) {
          if (!dataNeedEncryption(secretKey)) {
            continue;
          }
          const encryptedSecret = solutionContext.cryptoProvider.encrypt(localData[secretKey]);
          // always success
          if (encryptedSecret.isOk()) {
            localData[secretKey] = encryptedSecret.value;
          }
        }
      }
      const settingFile = path.resolve(confFolderPath, "settings.json");
      await fs.writeFile(envJsonFile, JSON.stringify(configJson, null, 4));
      await fs.writeFile(userDataFile, serializeDict(localData));
      await fs.writeFile(settingFile, JSON.stringify(solutionContext.projectSettings, null, 4));
      const core = ctx.self as FxCore;
      core.tools.logProvider.debug(`[core] persist config folder: ${confFolderPath}`);
    } catch (e) {
      ctx.res = err(WriteFileError(e));
    }
  }
};
