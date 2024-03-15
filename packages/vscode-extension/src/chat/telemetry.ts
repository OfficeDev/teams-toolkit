// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TelemetryEvent, TelemetryTriggerFrom } from "../telemetry/extTelemetryEvents";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { LanguageModelChatMessage } from "vscode";

export interface TelemetryMetadata {
  startTime: number;
  chatMessages: LanguageModelChatMessage[];
}

interface IChatTeletmetry {
  triggerFrom: TelemetryTriggerFrom;
  eventName: TelemetryEvent;
  chatMessages: LanguageModelChatMessage[];

  sendTelemetryEvent: () => void;
}

export class ChatTelemetry implements IChatTeletmetry {
  triggerFrom: TelemetryTriggerFrom = TelemetryTriggerFrom.CopilotChat;
  eventName: TelemetryEvent;
  chatMessages: LanguageModelChatMessage[] = [];

  constructor(eventName: TelemetryEvent) {
    this.eventName = eventName;
  }

  sendTelemetryEvent(): void {}
}
