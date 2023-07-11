// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FeatureFlagName } from "./constants";

// Determine whether feature flag is enabled based on environment variable setting
export function isFeatureFlagEnabled(featureFlagName: string, defaultValue = false): boolean {
  const flag = process.env[featureFlagName];
  if (flag === undefined) {
    return defaultValue; // allows consumer to set a default value when environment variable not set
  } else {
    return flag === "1" || flag.toLowerCase() === "true"; // can enable feature flag by set environment variable value to "1" or "true"
  }
}

/**
 * Update all preview feature flags.
 */
export function initializePreviewFeatureFlags(): void {
  process.env[FeatureFlagName.BotNotification] = "true";
  process.env[FeatureFlagName.M365App] = "true";
  process.env[FeatureFlagName.AadManifest] = "true";
  process.env[FeatureFlagName.ApiConnect] = "true";
  process.env[FeatureFlagName.DeployManifest] = "true";
}

export function isCLIDotNetEnabled(): boolean {
  return isFeatureFlagEnabled(FeatureFlagName.CLIDotNet, false);
}

export function isV3Enabled(): boolean {
  return process.env.TEAMSFX_V3 ? process.env.TEAMSFX_V3 === "true" : true;
}

export function isVideoFilterEnabled(): boolean {
  return isFeatureFlagEnabled(FeatureFlagName.VideoFilter, false);
}

export function isImportSPFxEnabled(): boolean {
  return true;
  //return isFeatureFlagEnabled(FeatureFlagName.ImportSPFx, false);
}

export function isCopilotPluginEnabled(): boolean {
  return isFeatureFlagEnabled(FeatureFlagName.CopilotPlugin, false);
}
