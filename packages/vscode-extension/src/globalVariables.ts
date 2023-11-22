// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CoreCallbackEvent, Tools } from "@microsoft/teamsfx-api";
import { AppStudioScopes, FxCore } from "@microsoft/teamsfx-core";
import {
  ProjectTypeResult,
  TeamsfxVersionState,
} from "@microsoft/teamsfx-core/build/common/projectTypeChecker";
import * as fs from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import { window } from "vscode";
import commandController from "./commandController";
import AzureAccountManager from "./commonlib/azureLogin";
import { signedIn, signedOut } from "./commonlib/common/constant";
import VsCodeLogInstance from "./commonlib/log";
import M365TokenInstance from "./commonlib/m365Login";
import { UserState } from "./constants";
import * as exp from "./exp/index";
import { VS_CODE_UI } from "./qm/vsc_ui";
import { ExtTelemetry } from "./telemetry/extTelemetry";
import { TelemetryProperty } from "./telemetry/extTelemetryEvents";
import { UriHandler } from "./uriHandler";
import { localize } from "./utils/localizeUtils";

/**
 * Common variables used throughout the extension. They must be initialized in the activate() method of extension.ts
 */
export let core: FxCore;
export let tools: Tools;
export let context: vscode.ExtensionContext;
export let workspaceUri: vscode.Uri | undefined;
export let isTeamsFxProject = false;
export let isSPFxProject = false;
export let isExistingUser = "no";
export let uriEventHandler: UriHandler;
export let defaultExtensionLogPath: string;
export let commandIsRunning = false;
export let projectTypeResult: ProjectTypeResult | undefined = {
  isTeamsFx: false,
  dependsOnTeamsJs: false,
  hasTeamsManifest: false,
  lauguages: [],
};

if (vscode.workspace && vscode.workspace.workspaceFolders) {
  if (vscode.workspace.workspaceFolders.length > 0) {
    workspaceUri = vscode.workspace.workspaceFolders[0].uri;
  }
}

export function getWorkspacePath(): string | undefined {
  return workspaceUri?.fsPath;
}

export function isTeamsfxUpgradable(): boolean {
  return projectTypeResult?.teamsfxVersionState === TeamsfxVersionState.Upgradable;
}

export function initFxCore() {
  const m365NotificationCallback = (
    status: string,
    token: string | undefined,
    accountInfo: Record<string, unknown> | undefined
  ) => {
    if (status === signedIn) {
      void window.showInformationMessage(localize("teamstoolkit.handlers.m365SignIn"));
    } else if (status === signedOut) {
      void window.showInformationMessage(localize("teamstoolkit.handlers.m365SignOut"));
    }
    return Promise.resolve();
  };
  void M365TokenInstance.setStatusChangeMap(
    "successfully-sign-in-m365",
    { scopes: AppStudioScopes },
    m365NotificationCallback,
    false
  );
  tools = {
    logProvider: VsCodeLogInstance,
    tokenProvider: {
      azureAccountProvider: AzureAccountManager,
      m365TokenProvider: M365TokenInstance,
    },
    telemetryReporter: ExtTelemetry.reporter,
    ui: VS_CODE_UI,
    expServiceProvider: exp.getExpService(),
  };
  core = new FxCore(tools);
  core.on(CoreCallbackEvent.lock, async (command: string) => {
    setCommandIsRunning(true);
    await commandController.lockedByOperation(command);
  });
  core.on(CoreCallbackEvent.unlock, async (command: string) => {
    setCommandIsRunning(false);
    await commandController.unlockedByOperation(command);
  });
}

export async function initializeGlobalVariables(ctx: vscode.ExtensionContext): Promise<void> {
  context = ctx;
  initFxCore();
  isExistingUser = context.globalState.get<string>(UserState.IsExisting) || "no";
  const workspacePath = getWorkspacePath();
  if (workspacePath) {
    const res = await core.checkProjectType(workspacePath);
    if (res.isOk()) {
      projectTypeResult = res.value;
      if (projectTypeResult.isTeamsFx) {
        isTeamsFxProject = true;
        // isSPFxProject = projectTypeResult.isSPFx;
        ExtTelemetry.addSharedProperty(
          TelemetryProperty.ProjectId,
          projectTypeResult.teamsfxProjectId as string
        );
        void AzureAccountManager.setStatusChangeMap(
          "successfully-sign-in-azure",
          (status, token, accountInfo) => {
            if (status === signedIn) {
              void window.showInformationMessage(localize("teamstoolkit.handlers.azureSignIn"));
            } else if (status === signedOut) {
              void window.showInformationMessage(localize("teamstoolkit.handlers.azureSignOut"));
            }
            return Promise.resolve();
          },
          false
        );
      } else {
        isSPFxProject = await fs.pathExists(path.join(workspacePath, "SPFx"));
      }
    }
  }
  // Default Extension log path
  // e.g. C:/Users/xx/AppData/Roaming/Code/logs/20230221T095340/window7/exthost/TeamsDevApp.ms-teams-vscode-extension
  defaultExtensionLogPath = ctx.logUri.fsPath;
  if (!(await fs.pathExists(defaultExtensionLogPath))) {
    await fs.mkdir(defaultExtensionLogPath);
  }
}

export function setUriEventHandler(uriHandler: UriHandler) {
  uriEventHandler = uriHandler;
}

export function setCommandIsRunning(isRunning: boolean) {
  commandIsRunning = isRunning;
}
