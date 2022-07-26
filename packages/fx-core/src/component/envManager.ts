// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ContextV3, FxError, InputsWithProjectPath, ok, Result } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import "reflect-metadata";
import { environmentManager } from "../core/environment";

export async function createNewEnv(
  context: ContextV3,
  inputs: InputsWithProjectPath
): Promise<Result<undefined, FxError>> {
  const envName = inputs.envName || environmentManager.getDefaultEnvName();
  const envConfig = environmentManager.newEnvConfigData(context.projectSetting.appName, undefined);
  const envConfigPath = path.join(inputs.projectPath, ".fx", "configs", `config.${envName}.json`);
  await fs.ensureDir(path.join(inputs.projectPath, ".fx", "configs"));
  await fs.writeFile(envConfigPath, JSON.stringify(envConfig, null, 4));
  return ok(undefined);
}
