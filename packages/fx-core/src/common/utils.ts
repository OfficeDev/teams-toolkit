// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as path from "path";
import fs from "fs-extra";
import { globalVars } from "../core/globalVars";
import { InputsWithProjectPath, v2 } from "@microsoft/teamsfx-api";
import { environmentManager } from "../core/environment";
import { loadEnvInfoV3 } from "../core/middleware/envInfoLoaderV3";

export async function getProjectTemplatesFolderPath(projectPath: string): Promise<string> {
  if (globalVars.isVS) {
    const bicepFolder = path.join(projectPath, "templates", "azure");
    const appFolder = path.join(projectPath, "templates", "appPackage");
    if ((await fs.pathExists(bicepFolder)) || (await fs.pathExists(appFolder))) {
      try {
        await fs.rename(path.join(projectPath, "templates"), path.join(projectPath, "Templates"));
      } catch (e) {
        return path.resolve(projectPath, "Templates");
      }
    }
    return path.resolve(projectPath, "Templates");
  }
  return path.resolve(projectPath, "templates");
}

export function convertToAlphanumericOnly(appName: string): string {
  return appName.replace(/[^\da-zA-Z]/g, "");
}

export async function resetProvisionState(
  inputs: InputsWithProjectPath,
  ctx: v2.Context
): Promise<void> {
  const allEnvRes = await environmentManager.listRemoteEnvConfigs(inputs.projectPath!);
  if (allEnvRes.isOk()) {
    for (const env of allEnvRes.value) {
      const loadEnvRes = await loadEnvInfoV3(
        inputs as v2.InputsWithProjectPath,
        ctx.projectSetting,
        env,
        false
      );
      if (loadEnvRes.isOk()) {
        const envInfo = loadEnvRes.value;
        if (
          envInfo.state?.solution?.provisionSucceeded === true ||
          envInfo.state?.solution?.provisionSucceeded === "true"
        ) {
          envInfo.state.solution.provisionSucceeded = false;
          await environmentManager.writeEnvState(
            envInfo.state,
            inputs.projectPath,
            ctx.cryptoProvider,
            env,
            true
          );
        }
      }
    }
  }
}
