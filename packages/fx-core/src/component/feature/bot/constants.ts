// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export class QuestionNames {
  public static readonly CAPABILITIES = "capabilities";
  public static readonly BOT_HOST_TYPE_TRIGGER = "bot-host-type-trigger";
}

export const NotificationTriggers = {
  HTTP: "http",
  TIMER: "timer",
} as const;

export type NotificationTrigger = typeof NotificationTriggers[keyof typeof NotificationTriggers];
