// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  globalStateGet,
  globalStateUpdate,
  LocalEnvManager,
  ProjectSettingsHelper,
  TaskDefinition,
} from "@microsoft/teamsfx-core";
import * as path from "path";
import * as vscode from "vscode";

import { ConfigurationKey } from "../constants";
import { VS_CODE_UI } from "../extension";
import { ext } from "../extensionVariables";
import { getConfiguration } from "../utils/commonUtils";
import { loadPackageJson } from "./commonUtils";
import * as StringResources from "../resources/Strings.json";
import { runTask } from "./teamsfxTaskHandler";
import { createTask } from "./teamsfxTaskProvider";
import VsCodeLogInstance from "../commonlib/log";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { TelemetryEvent } from "../telemetry/extTelemetryEvents";

export async function runNpmInstallAll(projectRoot: string): Promise<void> {
  const packageJson = await loadPackageJson(path.join(projectRoot, "package.json"));
  if (packageJson && packageJson.scripts && packageJson.scripts["installAll"]) {
    const terminal = vscode.window.createTerminal({
      cwd: projectRoot,
    });
    terminal.show();
    terminal.sendText("npm run installAll");
  }
}

export async function automaticNpmInstallHandler(
  excludeFrontend: boolean,
  excludeBackend: boolean,
  excludeBot: boolean
): Promise<void> {
  const state = globalStateGet("automaticNpmInstall", false);
  if (state) {
    globalStateUpdate("automaticNpmInstall", false);
    const configuration = getConfiguration(ConfigurationKey.AutomaticNpmInstall);
    if (configuration && ext.workspaceUri !== undefined) {
      const localEnvManager = new LocalEnvManager(
        VsCodeLogInstance,
        ExtTelemetry.reporter,
        VS_CODE_UI
      );
      const workspaceFolder = vscode.workspace.workspaceFolders![0];
      const workspacePath = workspaceFolder.uri.fsPath;
      const projectSettings = await localEnvManager.getProjectSettings(workspacePath);
      const tasks: Map<string, Promise<number | undefined>> = new Map();
      if (ProjectSettingsHelper.isSpfx(projectSettings)) {
        tasks.set(
          "spfx",
          runTask(await createTask(TaskDefinition.spfxInstall(workspacePath), workspaceFolder))
        );
      } else {
        if (!excludeFrontend && ProjectSettingsHelper.includeFrontend(projectSettings)) {
          tasks.set(
            "frontend",
            runTask(
              await createTask(TaskDefinition.frontendInstall(workspacePath), workspaceFolder)
            )
          );
        }
        if (!excludeBackend && ProjectSettingsHelper.includeBackend(projectSettings)) {
          tasks.set(
            "backend",
            runTask(await createTask(TaskDefinition.backendInstall(workspacePath), workspaceFolder))
          );
        }
        if (!excludeBot && ProjectSettingsHelper.includeBot(projectSettings)) {
          tasks.set(
            "bot",
            runTask(await createTask(TaskDefinition.botInstall(workspacePath), workspaceFolder))
          );
        }
      }
      if (tasks.size > 0) {
        try {
          const properties: { [key: string]: string } = {};
          for (const key of tasks.keys()) {
            properties[key] = "true";
          }
          ExtTelemetry.sendTelemetryEvent(TelemetryEvent.AutomaticNpmInstallStart, properties);
        } catch {
          // ignore telemetry error
        }
        VS_CODE_UI.showMessage(
          "info",
          StringResources.vsc.handlers.automaticNpmInstall,
          false,
          StringResources.vsc.handlers.disableAutomaticNpmInstall
        ).then((selection) => {
          if (
            selection.isOk() &&
            selection.value === StringResources.vsc.handlers.disableAutomaticNpmInstall
          ) {
            vscode.commands.executeCommand(
              "workbench.action.openSettings",
              ConfigurationKey.AutomaticNpmInstall
            );
            try {
              ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ClickDisableAutomaticNpmInstall);
            } catch {
              // ignore telemetry error
            }
          }
        });
        const keys = tasks.keys();
        const exitCodes = await Promise.all(tasks.values());
        try {
          const properties: { [key: string]: string } = {};
          for (const exitCode of exitCodes) {
            properties[keys.next().value] = exitCode + "";
          }
          ExtTelemetry.sendTelemetryEvent(TelemetryEvent.AutomaticNpmInstall, properties);
        } catch {
          // ignore telemetry error
        }
      }
    }
  }
}
