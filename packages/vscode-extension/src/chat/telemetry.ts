// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { LanguageModelChatMessage } from "vscode";
import { countMessagesTokens } from "./utils";
import { ITelemetryMetadata } from "./types";
import { getUuid } from "@microsoft/teamsfx-core";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
  TelemetryTriggerFrom,
} from "../telemetry/extTelemetryEvents";
import { TeamsChatCommand } from "./consts";

export class TelemetryMetadata implements ITelemetryMetadata {
  chatMessages: LanguageModelChatMessage[] = [];
  startTime: number;
  requestId: string;
  command: TeamsChatCommand | undefined;

  constructor(command: TeamsChatCommand | undefined, startTime?: number, requestId?: string) {
    this.command = command;
    this.startTime = startTime || Date.now();
    this.requestId = requestId || getUuid();
  }

  public chatMessagesTokenCount(): number {
    return countMessagesTokens(this.chatMessages);
  }

  public get properties(): { [key: string]: string } {
    return {
      [TelemetryProperty.CopilotChatRequestId]: this.requestId,
      [TelemetryProperty.CopilotChatCommand]: this.command || "",
    };
  }

  public get measurements(): { [key: string]: number } {
    return {
      [TelemetryProperty.CopilotChatTokenCount]: this.chatMessagesTokenCount(),
      [TelemetryProperty.CopilotChatTimeToComplete]: Date.now() - this.startTime,
    };
  }
}

export function sendStartTelemetry(
  eventName: TelemetryEvent,
  telemetryMetadata: ITelemetryMetadata
) {
  ExtTelemetry.sendTelemetryEvent(eventName, {
    [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.CopilotChat,
    ...telemetryMetadata.properties,
  });
}

export function sendTelemetry(eventName: TelemetryEvent, telemetryMetadata: ITelemetryMetadata) {
  ExtTelemetry.sendTelemetryEvent(
    eventName,
    {
      [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.CopilotChat,
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      ...telemetryMetadata.properties,
    },
    {
      ...telemetryMetadata.measurements,
    }
  );
}
