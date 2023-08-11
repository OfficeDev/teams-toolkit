// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { HookContext, NextFunction } from "@feathersjs/hooks";
import { Tools } from "@microsoft/teamsfx-api";

export let TOOLS: Tools;
export let Locale: string | undefined;
export function setTools(tools: Tools): void {
  TOOLS = tools;
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

export interface ErrorContextOption {
  component?: string;
  source?: ExternalSource;
  stage?: string;
  method?: string;
}

export function ErrorContextMW(option: ErrorContextOption) {
  return async (ctx: HookContext, next: NextFunction) => {
    option.method = ctx.method;
    setErrorContext(option);
    await next();
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
