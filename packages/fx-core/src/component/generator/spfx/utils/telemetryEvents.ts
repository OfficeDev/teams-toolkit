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
  UseNotRecommendedVersion = "use-not-recommended-spfx-version",
}

export enum TelemetryProperty {
  EnsureYoReason = "ensure-yo-reason",
  EnsureSharepointGeneratorReason = "ensure-sharepoint-generator-reason",
  EnsureLatestYoReason = "ensure-latest-yo-reason",
  EnsureLatestSharepointGeneratorReason = "ensure-latest-sharepoint-generator-reason",
  SPFxSolution = "spfx-solution",
}
