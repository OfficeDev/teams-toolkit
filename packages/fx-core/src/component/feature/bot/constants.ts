// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { BotNotificationTriggers } from "../../../plugins/solution/fx-solution/question";

export enum TemplateProjectsScenarios {
  DEFAULT_SCENARIO_NAME = "default",
  NOTIFICATION_RESTIFY_SCENARIO_NAME = "notification-restify",
  NOTIFICATION_WEBAPI_SCENARIO_NAME = "notification-webapi",
  NOTIFICATION_FUNCTION_BASE_SCENARIO_NAME = "notification-function-base",
  NOTIFICATION_FUNCTION_TRIGGER_HTTP_SCENARIO_NAME = "notification-trigger-http",
  NOTIFICATION_FUNCTION_TRIGGER_TIMER_SCENARIO_NAME = "notification-trigger-timer",
  COMMAND_AND_RESPONSE_SCENARIO_NAME = "command-and-response",
  WORKFLOW_SCENARIO_NAME = "workflow",
  M365_SCENARIO_NAME = "m365",
}

export const TriggerTemplateScenarioMappings = {
  [BotNotificationTriggers.Http]:
    TemplateProjectsScenarios.NOTIFICATION_FUNCTION_TRIGGER_HTTP_SCENARIO_NAME,
  [BotNotificationTriggers.Timer]:
    TemplateProjectsScenarios.NOTIFICATION_FUNCTION_TRIGGER_TIMER_SCENARIO_NAME,
} as const;

export class QuestionNames {
  public static readonly CAPABILITIES = "capabilities";
  public static readonly BOT_HOST_TYPE_TRIGGER = "bot-host-type-trigger";
}

export const NotificationTriggers = {
  HTTP: "http",
  TIMER: "timer",
} as const;

export type NotificationTrigger = typeof NotificationTriggers[keyof typeof NotificationTriggers];
export type BotTrigger = NotificationTrigger;
