// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export enum TelemetryPropertyKey {
  updateExistingApp = "update",
  publishedAppId = "published-app-id",
  customizedKeys = "customized-manifest-keys",
  customizedOpenAPIKeys = "customized-openapi-keys",
  customizedAIPluginKeys = "customized-ai-plugin-keys",
  customizedCopilotGptKeys = "customized-copilot-gpt-keys",
  validationErrors = "validation-errors",
  validationWarnings = "validation-warnings",
  OverwriteIfAppAlreadyExists = "overwrite-if-app-already-exists",
  region = "region",
  pluginValidationErrors = "plugin-validation-errors",
  gptValidationErrors = "gpt-validation-errors",
  gptActionValidationErrors = "gpt-action-validation-errors",
}

export enum TelemetryPropertyValue {
  Global = "global",
}
