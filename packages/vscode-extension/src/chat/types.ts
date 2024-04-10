// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { LanguageModelChatMessage, ChatResult } from "vscode";
import { TeamsChatCommand } from "./consts";
import { OfficeChatCommand } from "../officeChat/consts";

export interface ITelemetryData {
  properties: { [key: string]: string };
  measurements: { [key: string]: number };
}

export interface IChatTelemetryData {
  telemetryData: ITelemetryData;
  chatMessages: LanguageModelChatMessage[];
  command: string;
  requestId: string;
  startTime: number;

  chatMessagesTokenCount: () => number;
  get properties(): { [key: string]: string };
  get measurements(): { [key: string]: number };
}

export interface ICopilotChatResultMetadata {
  readonly command: TeamsChatCommand | OfficeChatCommand | undefined;
  readonly requestId: string;
}

export interface ICopilotChatResult extends ChatResult {
  readonly metadata?: ICopilotChatResultMetadata;
}
