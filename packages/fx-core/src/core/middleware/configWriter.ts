// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as fs from "fs-extra";
import * as path from "path";
import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
import * as error from "../error";
import { ConfigFolderName, err, Inputs, SolutionContext } from "@microsoft/teamsfx-api";
import { mapToJson, serializeDict, sperateSecretData } from "../../common/tools";

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
    const solutionContext: SolutionContext = ctx.self.ctx;
    const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
    if (solutionContext && inputs.projectPath && solutionContext.root) {
      try {
        const confFolderPath = path.resolve(solutionContext.root, `.${ConfigFolderName}`);
        const envName = solutionContext.projectSettings?.currentEnv;
        const solutionConfig = solutionContext.config;
        const configJson = mapToJson(solutionConfig);
        const jsonFilePath = path.resolve(confFolderPath, `env.${envName}.json`);
        const localDataPath = path.resolve(confFolderPath, `${envName}.userdata`);
        const localData = sperateSecretData(configJson);
        const content = JSON.stringify(configJson, null, 4);
        await fs.writeFile(jsonFilePath, content,);
        await fs.writeFile(localDataPath, serializeDict(localData));
        await fs.writeFile(path.resolve(confFolderPath, "settings.json"), solutionContext.projectSettings);
      } catch (e) {
        ctx.res = err(error.WriteFileError(e));
      }
    }
  }
};
