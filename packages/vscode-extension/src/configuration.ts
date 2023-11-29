// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as vscode from "vscode";
import { CONFIGURATION_PREFIX, ConfigurationKey } from "./constants";
import VsCodeLogInstance from "./commonlib/log";
import { LogLevel } from "@microsoft/teamsfx-api";

export function registerConfigChangeCallback() {
  loadConfigurations();
  vscode.workspace.onDidChangeConfiguration?.(changeConfigCallback);
}

export function getConfiguration(key: string, defaultValue: boolean | string): boolean | string {
  const configuration: vscode.WorkspaceConfiguration =
    vscode.workspace.getConfiguration(CONFIGURATION_PREFIX);
  return configuration.get<boolean | string>(key, defaultValue);
}

export function changeConfigCallback(event: vscode.ConfigurationChangeEvent) {
  if (event.affectsConfiguration(CONFIGURATION_PREFIX)) {
    loadConfigurations();
  }
}

export function loadConfigurations() {
  loadLogLevel();
  loadFeatureFlags();
}

export function loadFeatureFlags() {
  process.env["TEAMSFX_BICEP_ENV_CHECKER_ENABLE"] = getConfiguration(
    ConfigurationKey.BicepEnvCheckerEnable,
    false
  ).toString();
  process.env["DEVELOP_COPILOT_PLUGIN"] = getConfiguration(
    ConfigurationKey.CopilotPluginEnable,
    false
  ).toString();
}

export function loadLogLevel() {
  const logLevel = getConfiguration(ConfigurationKey.LogLevel, "info") as string;
  if (logLevel === "debug") {
    VsCodeLogInstance.logLevel = LogLevel.Debug;
  } else if (logLevel === "verbose") {
    VsCodeLogInstance.logLevel = LogLevel.Verbose;
  } else {
    VsCodeLogInstance.logLevel = LogLevel.Info;
  }
}
