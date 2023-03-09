// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export enum TelemetryEvents {
  Generate = "generate",
  EnsureYoStart = "ensure-yo-start",
  EnsureYo = "ensure-yo",
  EnsureLatestYoStart = "ensure-latest-yo-start",
  EnsureLatestYo = "ensure-latest-yo",
  EnsureSharepointGeneratorStart = "ensure-sharepoint-generator-start",
  EnsureSharepointGenerator = "ensure-sharepoint-generator",
  EnsureLatestSharepointGeneratorStart = "ensure-latest-sharepoint-start",
  EnsureLatestSharepointGenerator = "ensure-latest-sharepoint",
}

export enum TelemetryProperty {
  EnsureYoReason = "ensure-yo-reason",
  EnsureSharepointGeneratorReason = "ensure-sharepoint-generator-reason",
  EnsureLatestYoReason = "ensure-latest-yo-reason",
  NeedInstallYoLocally = "need-install-yo-locally",
  NeedInstallSharepointGeneratorLocally = "need-install-sharepoint-generator-locally",
  EnsureLatestSharepointGeneratorReason = "ensure-latest-sharepoint-generator-reason",
}
