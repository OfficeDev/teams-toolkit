// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export class FeatureFlags {
  static readonly InsiderPreview = "__TEAMSFX_INSIDER_PREVIEW";
  static readonly TelemetryTest = "TEAMSFX_TELEMETRY_TEST";
  static readonly DevTunnelTest = "TEAMSFX_DEV_TUNNEL_TEST";
  static readonly Preview = "TEAMSFX_PREVIEW";
  static readonly DevelopCopilotPlugin = "DEVELOP_COPILOT_PLUGIN";
  static readonly ChatParticipant = "TEAMSFX_CHAT_PARTICIPANT";
}

// Determine whether feature flag is enabled based on environment variable setting

export function isFeatureFlagEnabled(featureFlagName: string, defaultValue = false): boolean {
  const flag = process.env[featureFlagName];

  if (flag === undefined) {
    return defaultValue; // allows consumer to set a default value when environment variable not set
  } else {
    return flag === "1" || flag.toLowerCase() === "true"; // can enable feature flag by set environment variable value to "1" or "true"
  }
}

export function getAllFeatureFlags(): string[] | undefined {
  const result = Object.values(FeatureFlags)

    .filter((featureFlag: string) => {
      return isFeatureFlagEnabled(featureFlag);
    })

    .map((featureFlag) => {
      return featureFlag;
    });

  return result;
}
