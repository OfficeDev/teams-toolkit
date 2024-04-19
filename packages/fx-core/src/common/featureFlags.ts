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
export function initializePreviewFeatureFlags(): void {}

export function isCLIDotNetEnabled(): boolean {
  return featureFlagManager.getBooleanValue(FeatureFlags.CLIDotNet);
}

export function isCopilotPluginEnabled(): boolean {
  return featureFlagManager.getBooleanValue(FeatureFlags.CopilotPlugin);
}

export function isApiCopilotPluginEnabled(): boolean {
  return (
    featureFlagManager.getBooleanValue(FeatureFlags.ApiCopilotPlugin) && isCopilotPluginEnabled()
  );
}

export function enableTestToolByDefault(): boolean {
  return featureFlagManager.getBooleanValue(FeatureFlags.TestTool);
}

export function enableMETestToolByDefault(): boolean {
  return featureFlagManager.getBooleanValue(FeatureFlags.METestTool);
}

export function isApiKeyEnabled(): boolean {
  return featureFlagManager.getBooleanValue(FeatureFlags.ApiKey);
}

export function isNewGeneratorEnabled(): boolean {
  return featureFlagManager.getBooleanValue(FeatureFlags.NewGenerator);
}

export function isMultipleParametersEnabled(): boolean {
  return featureFlagManager.getBooleanValue(FeatureFlags.MultipleParameters);
}

export function isOfficeJSONAddinEnabled(): boolean {
  return featureFlagManager.getBooleanValue(FeatureFlags.OfficeAddin);
}

export function isTdpTemplateCliTestEnabled(): boolean {
  return featureFlagManager.getBooleanValue(FeatureFlags.TdpTemplateCliTest);
}

export function isAsyncAppValidationEnabled(): boolean {
  return featureFlagManager.getBooleanValue(FeatureFlags.AsyncAppValidation);
}

export function isNewProjectTypeEnabled(): boolean {
  return featureFlagManager.getBooleanValue(FeatureFlags.NewProjectType);
}

export function isChatParticipantEnabled(): boolean {
  return featureFlagManager.getBooleanValue(FeatureFlags.ChatParticipant);
}

///////////////////////////////////////////////////////////////////////////////
// Notes for Office Addin Feature flags:
// Case 1: TEAMSFX_OFFICE_ADDIN = false, TEAMSFX_OFFICE_XML_ADDIN = false
//   1.1 project-type option: `outlook-addin-type`
//   1.2 addin-host: not show but use `outlook` internally
//   1.3 capabilities options: [`json-taskpane`, `outlook-addin-import`]
//   1.4 programming-language options: [`typescript`] (skip in UI)
//   1.5 office-addin-framework-type: not show question but use `default_old` internally
//   1.6 generator class: OfficeAddinGenerator
//   1.7 template link: config.json.json-taskpane.default_old.typescript
// Case 2: TEAMSFX_OFFICE_ADDIN = false AND TEAMSFX_OFFICE_XML_ADDIN = true
//   2.1 project-type option: `office-xml-addin-type`
//   2.2 addin-host options: [`outlook`, `word`, `excel`, `powerpoint`]
//   2.3 capabilities options:
//     if (addin-host == `outlook`) then [`json-taskpane`, `outlook-addin-import`]
//     else if (addin-host == `word`) then [`word-taskpane`, `word-xxx`, ...]
//     else if (addin-host == `excel`) then [`excel-taskpane`, `excel-xxx`, ...]
//     else if (addin-host === `powerpoint`) then [`powerpoint-taskpane`, `powerpoint-xxx`, ...]
//   2.4 programming-language options:
//     if (addin-host == `outlook`) then [`typescript`] (skip in UI)
//     else two options: [`typescript`, `javascript`]
//   2.5 office-addin-framework-type options:
//      if (word excel and powerpoint) use `default` internally
//      else if (outlook) use `default_old` internally
//   2.6 generator class:
//     if (addin-host == `outlook`) then OfficeAddinGenerator
//     else OfficeXMLAddinGenerator
//   2.7 template link:
//     if (addin-host == `outlook`) config.json.json-taskpane.default.[programming-language]
//     else config[addin-host].[capabilities].default.[programming-language]
// Case 3: TEAMSFX_OFFICE_ADDIN = true AND TEAMSFX_OFFICE_XML_ADDIN = true
//   3.1 project-type option: `office-addin-type`
//   3.2 addin-host: not show but will use `wxpo` internally
//   3.3 capabilities options: [`json-taskpane`, `office-addin-import`, `office-content-addin`]
//   3.4 programming-language options: [`typescript`, `javascript`]
//   3.5 office-addin-framework-type options: [`default`, `react`]
//     if (capabilities == `json-taskpane`) then [`default`, `react`]
//     else if (capabilities == `office-addin-import`) then [`default`] (skip in UI)
//     else if (capabilities == `office-content-addin`) then [`default`] (skip in UI)
//   3.6 generator class: OfficeAddinGenerator
//   3.7 template link: config.json.[capabilities].[office-addin-framework-type].[programming-language]
// case 4: TEAMSFX_OFFICE_ADDIN = true AND TEAMSFX_OFFICE_XML_ADDIN = fasle
//   4.1 project-type option: `office-addin-type`
//   4.2 addin-host: not show but will use `wxpo` internally
//   4.3 capabilities options: [`json-taskpane`, `office-addin-import`]
//   4.4 programming-language options: [`typescript`, `javascript`]
//   4.5 office-addin-framework-type options: [`default`, `react`]
//     if (capabilities == `json-taskpane`) then [`default`, `react`]
//     else if (capabilities == `office-addin-import`) then [`default`] (skip in UI)
//     else if (capabilities == `office-content-addin`) then [`default`] (skip in UI)
//   4.6 generator class: OfficeAddinGenerator
//   4.7 template link: config.json.[capabilities].[office-addin-framework-type].[programming-language]
///////////////////////////////////////////////////////////////////////////////////////////////////////

export interface FeatureFlag {
  name: string;
  defaultValue: string;
  description?: string;
}

export class FeatureFlags {
  static readonly CLIDotNet = { name: FeatureFlagName.CLIDotNet, defaultValue: "false" };
  static readonly CopilotPlugin = { name: FeatureFlagName.CopilotPlugin, defaultValue: "false" };
  static readonly ApiCopilotPlugin = {
    name: FeatureFlagName.ApiCopilotPlugin,
    defaultValue: "false",
  };
  static readonly TestTool = { name: FeatureFlagName.TestTool, defaultValue: "true" };
  static readonly METestTool = { name: FeatureFlagName.METestTool, defaultValue: "true" };
  static readonly ApiKey = { name: FeatureFlagName.ApiKey, defaultValue: "false" };
  static readonly NewGenerator = { name: FeatureFlagName.NewGenerator, defaultValue: "false" };
  static readonly MultipleParameters = {
    name: FeatureFlagName.MultipleParameters,
    defaultValue: "true",
  };
  static readonly OfficeAddin = { name: FeatureFlagName.OfficeAddin, defaultValue: "false" };
  static readonly TdpTemplateCliTest = {
    name: FeatureFlagName.TdpTemplateCliTest,
    defaultValue: "false",
  };
  static readonly AsyncAppValidation = {
    name: FeatureFlagName.AsyncAppValidation,
    defaultValue: "false",
  };
  static readonly NewProjectType = { name: FeatureFlagName.NewProjectType, defaultValue: "true" };
  static readonly ChatParticipant = {
    name: FeatureFlagName.ChatParticipant,
    defaultValue: "false",
  };
}

export class FeatureFlagManager {
  getBooleanValue(featureFlag: FeatureFlag): boolean {
    return isFeatureFlagEnabled(
      featureFlag.name,
      featureFlag.defaultValue === "true" || featureFlag.defaultValue === "1"
    );
  }
  getStringValue(featureFlag: FeatureFlag): string {
    return process.env[featureFlag.name] || featureFlag.defaultValue;
  }
  list(): FeatureFlag[] {
    return Object.values(FeatureFlags);
  }
}

export const featureFlagManager = new FeatureFlagManager();
