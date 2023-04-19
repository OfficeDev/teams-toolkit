// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, FxError, InputsWithProjectPath, ok, Result } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { environmentManager } from "../core/environment";
import { TOOLS } from "../core/globalVars";
import { getLocalAppName } from "./resource/appManifest/utils/utils";

export async function createEnvWithName(
  targetEnvName: string,
  appName: string,
  inputs: InputsWithProjectPath,
  existingTabEndpoint?: string
): Promise<Result<undefined, FxError>> {
  if (targetEnvName === environmentManager.getLocalEnvName()) {
    appName = getLocalAppName(appName);
  }
  const newEnvConfig = environmentManager.newEnvConfigData(appName, existingTabEndpoint);
  const writeEnvResult = await environmentManager.writeEnvConfig(
    inputs.projectPath,
    newEnvConfig,
    targetEnvName
  );
  if (writeEnvResult.isErr()) {
    return err(writeEnvResult.error);
  }
  TOOLS.logProvider?.debug(
    `[core] persist ${targetEnvName} env state to path ${writeEnvResult.value}: ${JSON.stringify(
      newEnvConfig
    )}`
  );
  return ok(undefined);
}
