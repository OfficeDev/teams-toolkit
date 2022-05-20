// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ServiceType } from "../../../../common/azure-service/interfaces";
import { TemplateProjectsScenarios } from "../constants";
import {
  FunctionsHttpTriggerOptionItem,
  FunctionsTimerTriggerOptionItem,
  AppServiceOptionItem,
} from "../question";
import { HostTypes } from "../resources/strings";
import { ProgrammingLanguage } from "./enum";

const runtimeMap: Map<ProgrammingLanguage, string> = new Map<ProgrammingLanguage, string>([
  [ProgrammingLanguage.Js, "node"],
  [ProgrammingLanguage.Ts, "node"],
  [ProgrammingLanguage.Csharp, "csharp"],
]);
const defaultRuntime = "node";

const serviceMap: Map<string, ServiceType> = new Map<string, ServiceType>([
  [HostTypes.APP_SERVICE, ServiceType.AppService],
  [HostTypes.AZURE_FUNCTIONS, ServiceType.Functions],
]);
const defaultServiceType = ServiceType.AppService;

const langMap: Map<string, ProgrammingLanguage> = new Map<string, ProgrammingLanguage>([
  ["javascript", ProgrammingLanguage.Js],
  ["typescript", ProgrammingLanguage.Ts],
  ["csharp", ProgrammingLanguage.Csharp],
]);
const defaultLang = ProgrammingLanguage.Js;

const triggerScenariosMap: Map<string, string[]> = new Map<string, string[]>([
  [
    FunctionsHttpTriggerOptionItem.id,
    [
      TemplateProjectsScenarios.NOTIFICATION_FUNCTION_BASE_SCENARIO_NAME,
      TemplateProjectsScenarios.NOTIFICATION_FUNCTION_TRIGGER_HTTP_SCENARIO_NAME,
    ],
  ],
  [
    FunctionsTimerTriggerOptionItem.id,
    [
      TemplateProjectsScenarios.NOTIFICATION_FUNCTION_BASE_SCENARIO_NAME,
      TemplateProjectsScenarios.NOTIFICATION_FUNCTION_TRIGGER_TIMER_SCENARIO_NAME,
    ],
  ],
  [AppServiceOptionItem.id, [TemplateProjectsScenarios.NOTIFICATION_RESTIFY_SCENARIO_NAME]],
]);

export function getRuntime(lang: ProgrammingLanguage): string {
  const runtime = runtimeMap.get(lang);
  if (runtime) {
    return runtime;
  }
  return defaultRuntime;
}

export function getServiceType(hostType?: string): ServiceType {
  const serviceType = serviceMap.get(hostType ?? "");
  if (serviceType) {
    return serviceType;
  }
  return defaultServiceType;
}

export function getLanguage(lang?: string): ProgrammingLanguage {
  const language = langMap.get(lang?.toLowerCase() ?? "");
  if (language) {
    return language;
  }
  return defaultLang;
}

export function getTriggerScenarios(trigger: string): string[] {
  const scenarios = triggerScenariosMap.get(trigger);
  if (scenarios) {
    return scenarios;
  }
  throw new Error("invalid bot input");
}
