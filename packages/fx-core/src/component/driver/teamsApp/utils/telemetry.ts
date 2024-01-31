// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export enum TelemetryPropertyKey {
  component = "component",
  errorType = "error-type",
  errorCode = "error-code",
  errorMessage = "error-message",
  updateExistingApp = "update",
  success = "success",
  appId = "appid",
  tenantId = "tenant-id",
  publishedAppId = "published-app-id",
  customizedKeys = "customized-manifest-keys",
  customizedOpenAPIKeys = "customized-openapi-keys",
  validationErrors = "validation-errors",
  validationWarnings = "validation-warnings",
  OverwriteIfAppAlreadyExists = "overwrite-if-app-already-exists",
  region = "region",
}

export enum TelemetryPropertyValue {
  success = "yes",
  failure = "no",
  Global = "global",
}
