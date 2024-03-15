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
  process.env[FeatureFlagName.OfficeXMLAddin] = "true";
  process.env[FeatureFlagName.OfficeAddin] = "false";
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

export function isCopilotPluginEnabled(): boolean {
  return isFeatureFlagEnabled(FeatureFlagName.CopilotPlugin, false);
}

export function isApiCopilotPluginEnabled(): boolean {
  // return isFeatureFlagEnabled(FeatureFlagName.ApiCopilotPlugin, true) && isCopilotPluginEnabled();
  return isFeatureFlagEnabled(FeatureFlagName.ApiCopilotPlugin, false) && isCopilotPluginEnabled();
}

export function enableTestToolByDefault(): boolean {
  return isFeatureFlagEnabled(FeatureFlagName.TestTool, true);
}

export function isApiKeyEnabled(): boolean {
  return isFeatureFlagEnabled(FeatureFlagName.ApiKey, false);
}

export function isMultipleParametersEnabled(): boolean {
  return isFeatureFlagEnabled(FeatureFlagName.MultipleParameters, true);
}

export function isOfficeXMLAddinEnabled(): boolean {
  return isFeatureFlagEnabled(FeatureFlagName.OfficeXMLAddin, false);
}

export function isTeamsFxRebrandingEnabled(): boolean {
  return isFeatureFlagEnabled(FeatureFlagName.TeamsFxRebranding, false);
}

export function isTdpTemplateCliTestEnabled(): boolean {
  return isFeatureFlagEnabled(FeatureFlagName.TdpTemplateCliTest, false);
}

export function isAsyncAppValidationEnabled(): boolean {
  return isFeatureFlagEnabled(FeatureFlagName.AsyncAppValidation, false);
}

export function isNewProjectTypeEnabled(): boolean {
  return isFeatureFlagEnabled(FeatureFlagName.NewProjectType, true);
}

export function isOfficeJSONAddinEnabled(): boolean {
  return isFeatureFlagEnabled(FeatureFlagName.OfficeAddin, false);
}

export function isApiMeSSOEnabled(): boolean {
  return isFeatureFlagEnabled(FeatureFlagName.ApiMeSSO, false);
}
