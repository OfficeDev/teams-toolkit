// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export enum TelemetryEvents {
  Generate = "generate",
  EnsureYoStart = "ensure-yo-start",
  EnsureYo = "ensure-yo",
  EnsureSharepointGeneratorStart = "ensure-sharepoint-generator-start",
  EnsureSharepointGenerator = "ensure-sharepoint-generator",
  UseNotRecommendedVersion = "use-not-recommended-spfx-version",
  CheckAddWebPartPackage = "check-add-web-part-package",
  LearnMoreVersionMismatch = "learn-more-version-mismatch",
  GetSpfxNodeVersionFailed = "get-spfx-node-version-failed",
}

export enum TelemetryProperty {
  EnsureYoReason = "ensure-yo-reason",
  EnsureSharepointGeneratorReason = "ensure-sharepoint-generator-reason",
  SPFxSolution = "spfx-solution",
  ConfirmAddWebPartResult = "confirm-add-web-part-result",
  PackageSource = "package-source",
  UserAction = "user-action",
}
