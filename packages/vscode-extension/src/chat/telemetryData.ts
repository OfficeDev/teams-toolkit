// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { LanguageModelChatMessage } from "vscode";
import { countMessagesTokens } from "./utils";
import { ITelemetryMetadata } from "./types";

export class TelemetryMetadata implements ITelemetryMetadata {
  chatMessages: LanguageModelChatMessage[] = [];
  startTime: number;
  firstTokenTime?: number;
  requestStartTime?: number;

  constructor(startTime: number) {
    this.startTime = startTime;
  }

  public chatMessagesTokenCount(): number {
    return countMessagesTokens(this.chatMessages);
  }
}
