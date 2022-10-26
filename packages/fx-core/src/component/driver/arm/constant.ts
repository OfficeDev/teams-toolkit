// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export const Constants = {
  actionName: "arm/deploy", // DO NOT MODIFY the name
};

export enum TemplateType {
  Json = "json",
  Bicep = "bicep",
}

export const TelemetryProperties = {
  jsonTemplateCount: "json-template-count",
  bicepTemplateCount: "bicep-template-count",
};
