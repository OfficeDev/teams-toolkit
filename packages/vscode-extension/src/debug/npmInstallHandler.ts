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
      let showMessage = false;
      if (ProjectSettingsHelper.isSpfx(projectSettings)) {
        showMessage = true;
        runTask(await createTask(TaskDefinition.spfxInstall(workspacePath), workspaceFolder));
      } else {
        if (!excludeFrontend && ProjectSettingsHelper.includeFrontend(projectSettings)) {
          showMessage = true;
          runTask(await createTask(TaskDefinition.frontendInstall(workspacePath), workspaceFolder));
        }
        if (!excludeBackend && ProjectSettingsHelper.includeBackend(projectSettings)) {
          showMessage = true;
          runTask(await createTask(TaskDefinition.backendInstall(workspacePath), workspaceFolder));
        }
        if (!excludeBot && ProjectSettingsHelper.includeBot(projectSettings)) {
          showMessage = true;
          runTask(await createTask(TaskDefinition.botInstall(workspacePath), workspaceFolder));
        }
      }
      if (showMessage) {
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
          }
        });
      }
    }
  }
}
