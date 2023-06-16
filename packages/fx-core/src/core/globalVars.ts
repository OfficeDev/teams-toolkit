// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

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
}
export const globalVars = new GlobalVars();
