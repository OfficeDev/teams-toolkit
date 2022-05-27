// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ServiceType } from "../../../../common/azure-hosting/interfaces";
import { TemplateProjectsScenarios } from "../constants";
import {
  FunctionsHttpTriggerOptionItem,
  FunctionsTimerTriggerOptionItem,
  AppServiceOptionItem,
  AppServiceOptionItemForVS,
} from "../question";
import { HostTypes } from "../resources/strings";
import { ProgrammingLanguage, Runtime } from "./enum";

const runtimeMap: Map<ProgrammingLanguage, Runtime> = new Map<ProgrammingLanguage, Runtime>([
  [ProgrammingLanguage.Js, Runtime.Node],
  [ProgrammingLanguage.Ts, Runtime.Node],
  [ProgrammingLanguage.Csharp, Runtime.Dotnet],
]);
const defaultRuntime = Runtime.Node;

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
  [AppServiceOptionItemForVS.id, [TemplateProjectsScenarios.NOTIFICATION_WEBAPI_SCENARIO_NAME]],
]);

const projectFileMap = new Map<Runtime, (appName: string) => string>([
  [Runtime.Node, (_: string) => "package.json"],
  [Runtime.Dotnet, (appName: string) => `${appName}.csproj`],
]);

export function getRuntime(lang: ProgrammingLanguage): Runtime {
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

export function getProjectFileName(runtime: Runtime, appName: string): string {
  const projectFileName = projectFileMap.get(runtime);
  if (projectFileName) {
    return projectFileName(appName);
  }
  throw new Error("invalid bot input");
}
