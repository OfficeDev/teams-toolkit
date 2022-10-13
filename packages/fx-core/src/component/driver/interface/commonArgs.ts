// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureAccountProvider,
  LogProvider,
  M365TokenProvider,
  Platform,
  TelemetryReporter,
  UserInteraction,
} from "@microsoft/teamsfx-api";

export type DriverContext = {
  azureAccountProvider: AzureAccountProvider;
  m365TokenProvider: M365TokenProvider;
  ui: UserInteraction | undefined;
  logProvider: LogProvider;
  telemetryReporter: TelemetryReporter;
  projectPath: string;
  platform: Platform;
};

export type AzureResourceInfo = {
  subscriptionId: string;
  resourceGroupName: string;
  instanceId: string;
};
