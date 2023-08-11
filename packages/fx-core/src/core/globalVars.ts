// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Tools } from "@microsoft/teamsfx-api";
import { TelemetryReporterInstance } from "../common/telemetry";

export let TOOLS: Tools;
export let Locale: string | undefined;
export function setTools(tools: Tools): void {
  TOOLS = tools;
  TelemetryReporterInstance.telemetryReporter = tools.telemetryReporter;
}
export function setLocale(locale?: string): void {
  Locale = locale;
}

class GlobalVars {
  isVS?: boolean = false;
  teamsAppId = "";
  m365TenantId = "";
  trackingId?: string;
  ymlFilePath?: string;
  envFilePath?: string;

  //properties for error telemetry
  stage = "";
  source: ExternalSource = "";
  component = "";
  method = "";
}
export const globalVars = new GlobalVars();

export function ErrorContextMW(option: {
  component?: string;
  source?: ExternalSource;
  stage?: string;
  method?: string;
}) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    option.method = descriptor.value.name;
    setErrorContext(option);
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
      const result = originalMethod.apply(this, args);
      return result;
    };
    return descriptor;
  };
}
export function setErrorContext(option: {
  component?: string;
  source?: ExternalSource;
  stage?: string;
  method?: string;
}): void {
  globalVars.component = option.component || globalVars.component;
  globalVars.source = option.source || globalVars.source;
  globalVars.stage = option.stage || globalVars.stage;
  globalVars.method = option.method || globalVars.method;
}

export type ExternalSource =
  | "Graph"
  | "Azure"
  | "Teams"
  | "BotFx"
  | "SPFx"
  | "DevTools"
  | "M365"
  | "";
