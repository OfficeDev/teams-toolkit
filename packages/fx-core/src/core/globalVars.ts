// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  LogProvider,
  Stage,
  TelemetryReporter,
  Tools,
  UserInteraction,
} from "@microsoft/teamsfx-api";

export let GlobalVars: {
  logger: LogProvider;
  currentStage: Stage;
  ui: UserInteraction;
  telemetryReporter?: TelemetryReporter;
};

export function setTools(tools: Tools): void {
  GlobalVars.logger = tools.logProvider;
  GlobalVars.ui = tools.ui;
  GlobalVars.telemetryReporter = tools.telemetryReporter;
}
