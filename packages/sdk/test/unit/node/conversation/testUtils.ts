// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TurnContext } from "botbuilder-core";
import { Activity } from "botframework-schema";
import {
  CommandMessage,
  NotificationTarget,
  NotificationTargetStorage,
  NotificationTargetType,
  TeamsFxBotCommandHandler,
  TriggerPatterns,
} from "../../../../src/conversation/interface";

export class TestStorage implements NotificationTargetStorage {
  public items: any = {};

  read(key: string): Promise<{ [key: string]: unknown } | undefined> {
    return new Promise((resolve) => resolve(this.items[key]));
  }

  list(): Promise<{ [key: string]: unknown }[]> {
    return new Promise((resolve) =>
      resolve(Object.entries(this.items).map((entry) => entry[1] as { [key: string]: unknown }))
    );
  }

  write(key: string, object: { [key: string]: unknown }): Promise<void> {
    return new Promise((resolve) => {
      this.items[key] = object;
      resolve();
    });
  }

  delete(key: string): Promise<void> {
    return new Promise((resolve) => {
      delete this.items[key];
      resolve();
    });
  }
}

export class TestTarget implements NotificationTarget {
  public content: any;
  public type?: NotificationTargetType | undefined;
  public sendMessage(text: string): Promise<void> {
    return new Promise((resolve) => {
      this.content = text;
      resolve();
    });
  }
  public sendAdaptiveCard(card: unknown): Promise<void> {
    return new Promise((resolve) => {
      this.content = card;
      resolve();
    });
  }
}

export class TestCommandHandler implements TeamsFxBotCommandHandler {
  public readonly triggerPatterns: TriggerPatterns;

  public isInvoked: boolean = false;
  public lastReceivedMessage: CommandMessage | undefined;

  constructor(patterns: TriggerPatterns) {
    this.triggerPatterns = patterns;
  }

  async handleCommandReceived(
    context: TurnContext,
    message: CommandMessage
  ): Promise<string | Partial<Activity> | void> {
    this.isInvoked = true;
    this.lastReceivedMessage = message;
    return "Sample command response";
  }
}

export class MockContext {
  private activity: any;
  constructor(text: string) {
    this.activity = {
      text: text,
      type: "message",
      recipient: {
        id: "1",
        name: "test-bot",
      },
    };
  }

  public sendActivity(activity: any): Promise<void> {
    return new Promise((resolve) => {
      console.log("Send activity successfully.");
      resolve();
    });
  }
}
