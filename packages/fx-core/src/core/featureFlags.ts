// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ProjectSettings } from "@microsoft/teamsfx-api";
export class FeatureFlagName {
  static readonly BicepEnvCheckerEnable = "TEAMSFX_BICEP_ENV_CHECKER_ENABLE";
  static readonly APIV3 = "TEAMSFX_APIV3";
  // This will default to true and this environment is only for tests. It does not expose to user.
  static readonly InsiderPreview = "__TEAMSFX_INSIDER_PREVIEW";
  static readonly rootDirectory = "TEAMSFX_ROOT_DIRECTORY";
  static readonly VSCallingCLI = "VS_CALLING_CLI";
}

export function isV3(): boolean {
  return isFeatureFlagEnabled(FeatureFlagName.APIV3);
}

// On VS calling CLI, interactive questions need to be skipped.
export function isVsCallingCli(): boolean {
  return isFeatureFlagEnabled(FeatureFlagName.VSCallingCLI);
}

export function isVSProject(projectSettings: ProjectSettings): boolean {
  return projectSettings.programmingLanguage === "csharp";
}

export function isFeatureFlagEnabled(featureFlagName: string, defaultValue = false): boolean {
  const flag = process.env[featureFlagName];
  if (flag === undefined) {
    return defaultValue; // allows consumer to set a default value when environment variable not set
  } else {
    return flag === "1" || flag.toLowerCase() === "true"; // can enable feature flag by set environment variable value to "1" or "true"
  }
}
