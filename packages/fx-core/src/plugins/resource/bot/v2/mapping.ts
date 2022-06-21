// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Platform } from "@microsoft/teamsfx-api";
import { ServiceType } from "../../../../common/azure-hosting/interfaces";
import { TemplateProjectsScenarios } from "../constants";
import {
  FunctionsHttpTriggerOptionItem,
  FunctionsTimerTriggerOptionItem,
  AppServiceOptionItem,
  AppServiceOptionItemForVS,
} from "../question";
import { BicepModules, HostType, ProgrammingLanguage, Runtime } from "./enum";

const runtimeMap: Map<ProgrammingLanguage, Runtime> = new Map<ProgrammingLanguage, Runtime>([
  [ProgrammingLanguage.Js, Runtime.Node],
  [ProgrammingLanguage.Ts, Runtime.Node],
  [ProgrammingLanguage.Csharp, Runtime.Dotnet],
]);

const serviceMap: Map<string, ServiceType> = new Map<string, ServiceType>([
  [HostType.AppService, ServiceType.AppService],
  [HostType.Functions, ServiceType.Functions],
]);

const langMap: Map<string, ProgrammingLanguage> = new Map<string, ProgrammingLanguage>([
  ["javascript", ProgrammingLanguage.Js],
  ["typescript", ProgrammingLanguage.Ts],
  ["csharp", ProgrammingLanguage.Csharp],
]);

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

const PlatformRuntimeMap: Map<Platform, Runtime> = new Map<Platform, Runtime>([
  [Platform.VS, Runtime.Dotnet],
  [Platform.VSCode, Runtime.Node],
  [Platform.CLI, Runtime.Node],
  [Platform.CLI_HELP, Runtime.Node],
]);

function getKeyNotFoundInMapErrorMsg(key: any, map: Map<any, any>) {
  const mapName = Object.keys({ map })[0];
  return `The key ${key} is not found in map ${mapName}.`;
}

const projectFileMap = new Map<Runtime, (appName: string) => string>([
  [Runtime.Node, (_: string) => "package.json"],
  [Runtime.Dotnet, (appName: string) => `${appName}.csproj`],
]);

export const moduleMap: { [key: string]: string } = {
  [ServiceType.Functions]: BicepModules.Functions,
};

export function getPlatformRuntime(platform: Platform): Runtime {
  const runtime = PlatformRuntimeMap.get(platform);
  if (runtime) {
    return runtime;
  }
  throw new Error(getKeyNotFoundInMapErrorMsg(platform, PlatformRuntimeMap));
}

export function getRuntime(lang: ProgrammingLanguage): Runtime {
  const runtime = runtimeMap.get(lang);
  if (runtime) {
    return runtime;
  }
  throw new Error(getKeyNotFoundInMapErrorMsg(lang, runtimeMap));
}

export function getServiceType(hostType?: string): ServiceType {
  const serviceType = serviceMap.get(hostType ?? "");
  if (serviceType) {
    return serviceType;
  }
  throw new Error(getKeyNotFoundInMapErrorMsg(hostType, serviceMap));
}

export function getLanguage(lang?: string): ProgrammingLanguage {
  const language = langMap.get(lang?.toLowerCase() ?? "");
  if (language) {
    return language;
  }
  throw new Error(getKeyNotFoundInMapErrorMsg(lang, langMap));
}

export function getTriggerScenarios(trigger: string): string[] {
  const scenarios = triggerScenariosMap.get(trigger);
  if (scenarios) {
    return scenarios;
  }
  throw new Error(getKeyNotFoundInMapErrorMsg(trigger, triggerScenariosMap));
}

export function getProjectFileName(runtime: Runtime, appName: string): string {
  const projectFileName = projectFileMap.get(runtime);
  if (projectFileName) {
    return projectFileName(appName);
  }
  throw new Error(getKeyNotFoundInMapErrorMsg(runtime, projectFileMap));
}
