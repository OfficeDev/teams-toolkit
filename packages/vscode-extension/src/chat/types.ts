// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { LanguageModelChatMessage, ChatResult } from "vscode";
import { TelemetryProperty } from "../telemetry/extTelemetryEvents";

export interface ISharedTelemetryProperty {
  [TelemetryProperty.CorrelationId]: string;
}

// metadata is used to generate telemetryData
export interface ITelemetryMetadata {
  chatMessages: LanguageModelChatMessage[];
  startTime: number;
  // time to start make chat request
  requestStartTime?: number;
  // time to receive the first stream from LLM
  firstTokenTime?: number;

  chatMessagesTokenCount: () => number;
}

export interface ICopilotChatResultMetadata {
  readonly command: string;
  readonly sharedTelemetryProperty: ISharedTelemetryProperty;
}

export interface ICopilotChatResult extends ChatResult {
  metadata?: Partial<ICopilotChatResultMetadata>;
}
