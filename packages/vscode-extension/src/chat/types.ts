// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { LanguageModelChatMessage, ChatResult } from "vscode";
import { TeamsChatCommand } from "./consts";

// metadata is used to generate telemetryData
export interface ITelemetryMetadata {
  chatMessages: LanguageModelChatMessage[];
  startTime: number;
  requestId: string;
  command: TeamsChatCommand | undefined;

  chatMessagesTokenCount: () => number;

  get properties(): { [key: string]: string };
  get measurements(): { [key: string]: number };
}

export interface ICopilotChatResultMetadata {
  readonly command: TeamsChatCommand | undefined;
  readonly requestId: string;
}

export interface ICopilotChatResult extends ChatResult {
  readonly metadata?: ICopilotChatResultMetadata;
}
