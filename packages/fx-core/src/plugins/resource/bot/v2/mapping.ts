// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ServiceType } from "../../../../common/azure-hosting/interfaces";
import { BotNotificationTriggers } from "../../../solution";
import { TemplateProjectsScenarios } from "../constants";
import { HostTypes } from "../resources/strings";
import { ProgrammingLanguage } from "./enum";

const runtimeMap: Map<string, string> = new Map<string, string>([
  [ProgrammingLanguage.Js, "node"],
  [ProgrammingLanguage.Ts, "node"],
  [ProgrammingLanguage.Csharp, "csharp"],
]);

const serviceMap: Map<string, ServiceType> = new Map<string, ServiceType>([
  [HostTypes.APP_SERVICE, ServiceType.AppService],
  [HostTypes.AZURE_FUNCTIONS, ServiceType.Functions],
]);

const langMap: Map<string, string> = new Map<string, string>([
  ["javascript", ProgrammingLanguage.Js],
  ["typescript", ProgrammingLanguage.Ts],
  ["csharp", ProgrammingLanguage.Csharp],
]);

const triggerScenarioMap: Map<string, string> = new Map<string, string>([
  [
    BotNotificationTriggers.Http,
    TemplateProjectsScenarios.NOTIFICATION_FUNCTION_TRIGGER_HTTP_SCENARIO_NAME,
  ],
  [
    BotNotificationTriggers.Timer,
    TemplateProjectsScenarios.NOTIFICATION_FUNCTION_TRIGGER_TIMER_SCENARIO_NAME,
  ],
]);

export function getRuntime(lang: string): string {
  const runtime = runtimeMap.get(lang);
  if (runtime) {
    return runtime;
  }
  throw new Error("invalid bot input");
}

export function getServiceType(hostType: string): ServiceType {
  const serviceType = serviceMap.get(hostType);
  if (serviceType) {
    return serviceType;
  }
  throw new Error("invalid bot input");
}

export function getLanguage(lang: string): string {
  const language = langMap.get(lang.toLowerCase());
  if (language) {
    return language;
  }
  throw new Error("invalid bot input");
}

export function getTemplateScenarioFromTrigger(trigger: string): string {
  const scenario = triggerScenarioMap.get(trigger);
  if (scenario) {
    return scenario;
  }
  throw new Error("invalid bot input" + scenario);
}
