// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs } from "@microsoft/teamsfx-api";
import { DriverContext } from "../interface/commonArgs";
import { TOOLS } from "../../../common/globalVars";

// Needs to validate the parameters outside of the function
export function loadStateFromEnv(
  outputEnvVarNames: Map<string, string>
): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};
  for (const [propertyName, envVarName] of outputEnvVarNames) {
    result[propertyName] = process.env[envVarName];
  }
  return result;
}

// Needs to validate the parameters outside of the function
export function mapStateToEnv(
  state: Record<string, string>,
  outputEnvVarNames: Map<string, string>,
  excludedProperties?: string[]
): Map<string, string> {
  const result = new Map<string, string>();
  for (const [outputName, envVarName] of outputEnvVarNames) {
    if (!excludedProperties?.includes(outputName)) {
      result.set(envVarName, state[outputName]);
    }
  }
  return result;
}

export function createDriverContext(inputs: Inputs): DriverContext {
  const driverContext: DriverContext = {
    azureAccountProvider: TOOLS.tokenProvider.azureAccountProvider,
    m365TokenProvider: TOOLS.tokenProvider.m365TokenProvider,
    ui: TOOLS.ui,
    progressBar: undefined,
    logProvider: TOOLS.logProvider,
    telemetryReporter: TOOLS.telemetryReporter!,
    projectPath: inputs.projectPath!,
    platform: inputs.platform,
  };
  return driverContext;
}
