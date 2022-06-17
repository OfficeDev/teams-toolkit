// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { LogProvider, Stage, Tools } from "@microsoft/teamsfx-api";
import { FeatureFlagName } from "../common/constants";

function featureFlagEnabled(flagName: string): boolean {
  const flag = process.env[flagName];
  if (flag !== undefined && flag.toLowerCase() === "true") {
    return true;
  } else {
    return false;
  }
}

export function isV3(): boolean {
  return featureFlagEnabled(FeatureFlagName.APIV3);
}

export function isVsCallingCli(): boolean {
  return featureFlagEnabled(FeatureFlagName.VSCallingCLI);
}

export let Logger: LogProvider;
export let currentStage: Stage;
export let TOOLS: Tools;
export let Locale: string | undefined;
export const isVS = false;
export function setTools(tools: Tools): void {
  TOOLS = tools;
  Logger = tools.logProvider;
}
export function setLocale(locale?: string): void {
  Locale = locale;
}
export function setCurrentStage(stage: Stage): void {
  currentStage = stage;
}
export class GlobalVars {
  isVS?: boolean = false;
}
export const globalVars = new GlobalVars();
