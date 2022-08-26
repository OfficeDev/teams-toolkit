// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Storage, StoreItems, TurnContext } from "botbuilder";
import { Activity } from "botframework-schema";
import {
  CommandMessage,
  MessageResponse,
  NotificationTarget,
  NotificationTargetStorage,
  NotificationTargetType,
  TeamsFxBotCommandHandler,
  TeamsFxBotSsoCommandHandler,
  TriggerPatterns,
} from "../../../../src/conversation/interface";
import { v4 as uuidv4 } from "uuid";

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
  public sendMessage(text: string): Promise<MessageResponse> {
    return new Promise((resolve) => {
      this.content = text;
      resolve({});
    });
  }
  public sendAdaptiveCard(card: unknown): Promise<MessageResponse> {
    return new Promise((resolve) => {
      this.content = card;
      resolve({});
    });
  }
}

export class TestSsoCommandHandler implements TeamsFxBotSsoCommandHandler {
  public triggerPatterns: TriggerPatterns;
  public commandId?: string | undefined;
  constructor(patterns: TriggerPatterns, commandId?: string) {
    this.triggerPatterns = patterns;
    if (commandId) {
      this.commandId = commandId ?? uuidv4();
    }
  }
  async handleCommandReceived(
    context: TurnContext,
    message: CommandMessage,
    ssoToken: string
  ): Promise<string | void | Partial<Activity>> {
    return "Sample command response";
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
  constructor(text: string, type = "message") {
    this.activity = {
      text: text,
      type: type,
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

export class CustomStorage implements Storage {
  read(keys: string[]): Promise<StoreItems> {
    return Promise.resolve({});
  }
  write(changes: StoreItems): Promise<void> {
    return Promise.resolve();
  }
  delete(keys: string[]): Promise<void> {
    return Promise.resolve();
  }
}
