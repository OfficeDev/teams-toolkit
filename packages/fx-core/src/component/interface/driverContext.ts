// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureAccountProvider,
  IProgressHandler,
  LogProvider,
  M365TokenProvider,
  TelemetryReporter,
} from "@microsoft/teamsfx-api";

export type DriverContext = {
  azureAccountProvider: AzureAccountProvider;
  m365TokenProvider: M365TokenProvider;
  progressBar: IProgressHandler | undefined;
  logProvider: LogProvider;
  telemetryReporter: TelemetryReporter;
};
