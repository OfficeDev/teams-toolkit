// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ContextV3,
  FxError,
  IProgressHandler,
  LogProvider,
  TelemetryReporter,
} from "@microsoft/teamsfx-api";

export interface ActionContext extends ContextV3 {
  source?: string;
  local?: Record<string, any>;
  logger?: LogProvider;
  progressBar?: IProgressHandler;
  telemetry?: ActionTelemetryReporter;
}

export interface ActionTelemetryReporter extends TelemetryReporter {
  stage: string;
  componentName: string;
  properties: { [key: string]: string };
  measurements: { [key: string]: number };
  addProperty: (key: string, value: string) => void;
  sendStartEvent?: ActionHandler;
  sendEndEvent?: ActionHandler;
  sendEndEventWithError?: (context: ActionContext, error: FxError) => void;
}

export type AErrorHandler = (context: ActionContext, error: any) => FxError;
export type ActionHandler = (context: ActionContext) => void;
