// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Platform } from "@microsoft/teamsfx-api";
import { ServiceType } from "../../../../common/azure-hosting/interfaces";
import { TemplateProjectsScenarios } from "../constants";
import { KeyNotFoundInMapError } from "../errors";
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
  throw new KeyNotFoundInMapError(platform);
}

export function getRuntime(lang: ProgrammingLanguage): Runtime {
  const runtime = runtimeMap.get(lang);
  if (runtime) {
    return runtime;
  }
  throw new KeyNotFoundInMapError(lang);
}

export function getServiceType(hostType?: string): ServiceType {
  const serviceType = serviceMap.get(hostType ?? "");
  if (serviceType) {
    return serviceType;
  }
  throw new KeyNotFoundInMapError(hostType);
}

export function getLanguage(lang?: string): ProgrammingLanguage {
  const language = langMap.get(lang?.toLowerCase() ?? "");
  if (language) {
    return language;
  }
  throw new KeyNotFoundInMapError(lang);
}

export function getTriggerScenarios(trigger: string): string[] {
  const scenarios = triggerScenariosMap.get(trigger);
  if (scenarios) {
    return scenarios;
  }
  throw new KeyNotFoundInMapError(trigger);
}

export function getProjectFileName(runtime: Runtime, appName: string): string {
  const projectFileName = projectFileMap.get(runtime);
  if (projectFileName) {
    return projectFileName(appName);
  }
  throw new KeyNotFoundInMapError(runtime);
}
