// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as vscode from "vscode";
import { CONFIGURATION_PREFIX, ConfigurationKey } from "./constants";
import VsCodeLogInstance from "./commonlib/log";
import { LogLevel } from "@microsoft/teamsfx-api";

export class ConfigManager {
  registerConfigChangeCallback() {
    this.loadConfigs();
    vscode.workspace.onDidChangeConfiguration?.(this.changeConfigCallback.bind(this));
  }
  loadConfigs() {
    this.loadLogLevel();
    this.loadFeatureFlags();
  }
  loadFeatureFlags() {
    process.env["TEAMSFX_BICEP_ENV_CHECKER_ENABLE"] = this.getConfiguration(
      ConfigurationKey.BicepEnvCheckerEnable,
      false
    ).toString();
    process.env["DEVELOP_COPILOT_PLUGIN"] = this.getConfiguration(
      ConfigurationKey.CopilotPluginEnable,
      false
    ).toString();
  }
  loadLogLevel() {
    const logLevel = this.getConfiguration(ConfigurationKey.LogLevel, "Info") as string;
    if (logLevel === "Debug") {
      VsCodeLogInstance.logLevel = LogLevel.Debug;
    } else if (logLevel === "Verbose") {
      VsCodeLogInstance.logLevel = LogLevel.Verbose;
    } else {
      VsCodeLogInstance.logLevel = LogLevel.Info;
    }
  }
  getConfiguration(key: string, defaultValue: boolean | string): boolean | string {
    const configuration: vscode.WorkspaceConfiguration =
      vscode.workspace.getConfiguration(CONFIGURATION_PREFIX);
    return configuration.get<boolean | string>(key, defaultValue);
  }
  changeConfigCallback(event: vscode.ConfigurationChangeEvent) {
    if (event.affectsConfiguration(CONFIGURATION_PREFIX)) {
      this.loadConfigs();
    }
  }
}

export const configMgr = new ConfigManager();
