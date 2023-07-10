// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

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
