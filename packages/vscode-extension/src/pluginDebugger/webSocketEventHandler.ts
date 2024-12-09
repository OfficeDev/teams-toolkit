// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { Protocol } from "devtools-protocol";
import { CopilotDebugLog, RED, WHITE } from "./copilotDebugLogOutput";

interface BotTextMessage {
  messageType: string | undefined;
  text: string;
  createdAt: string;
}

export class WebSocketEventHandler {
  static handleEvent(response: Protocol.Network.WebSocketFrame): void {
    if (!this.isWebSocketDataRelevant(response)) {
      return;
    }

    try {
      const objects = this.splitObjects(response);
      for (const object of objects) {
        const parsedObject = JSON.parse(object) as { item: { messages: BotTextMessage[] } };
        if (parsedObject.item && parsedObject.item.messages) {
          const botTextMessages = this.selectBotTextMessages(parsedObject);
          for (const botTextMessage of botTextMessages) {
            this.convertBotMessageToChannelOutput(botTextMessage);
          }
        } else {
          console.warn("Parsed response object does not contain item or messages:", parsedObject);
        }
      }
    } catch (error) {
      void vscode.window.showErrorMessage(`Error parsing response, ${(error as Error).message}`);
      vscode.debug.activeDebugConsole.appendLine(
        `${RED} (×) Error: ${WHITE} Error parsing response: ${(error as Error).message}`
      );
    }
  }

  // only type 2 messages contain developer logs
  static isWebSocketDataRelevant(response: Protocol.Network.WebSocketFrame) {
    return response.payloadData.startsWith('{"type":2');
  }

  static splitObjects(response: Protocol.Network.WebSocketFrame): string[] {
    const objectSeparator = "\x1e"; // ASCII record separator
    return response.payloadData
      .split(objectSeparator)
      .filter((object: string) => object.length > 0);
  }

  static selectBotTextMessages(object: { item: { messages: BotTextMessage[] } }): BotTextMessage[] {
    return object.item.messages.filter((message) => message.messageType === "DeveloperLogs");
  }

  static convertBotMessageToChannelOutput(botTextMessage: BotTextMessage): void {
    new CopilotDebugLog(botTextMessage.text).write();
  }

  static convertBotMessageToChannelOutputJson(botTextMessage: BotTextMessage): CopilotDebugLog {
    return new CopilotDebugLog(this.prettyPrintJson(botTextMessage.text));
  }

  static prettyPrintJson(jsonText: string): string {
    return JSON.stringify(JSON.parse(jsonText), null, 2);
  }
}
