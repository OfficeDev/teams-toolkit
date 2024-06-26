// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/* eslint-disable @typescript-eslint/no-floating-promises */

/**
 * @author Huajie Zhang <zhjay23@qq.com>
 */
"use strict";

import {
  FxError,
  Result,
  SelectFileConfig,
  SelectFolderConfig,
  Stage,
  UserError,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import {
  AppStudioScopes,
  AuthSvcScopes,
  CapabilityOptions,
  DepsManager,
  DepsType,
  Hub,
  QuestionNames,
  assembleError,
  isValidProject,
  teamsDevPortalClient,
} from "@microsoft/teamsfx-core";
import * as path from "path";
import * as util from "util";
import * as vscode from "vscode";
import VsCodeLogInstance from "./commonlib/log";
import M365TokenInstance from "./commonlib/m365Login";
import { PanelType } from "./controls/PanelType";
import { WebviewPanel } from "./controls/webviewPanel";
import { checkPrerequisitesForGetStarted } from "./debug/depsChecker/getStartedChecker";
import { vscodeLogger } from "./debug/depsChecker/vscodeLogger";
import { vscodeTelemetry } from "./debug/depsChecker/vscodeTelemetry";
import { openHubWebClient } from "./debug/launch";
import { selectAndDebug } from "./debug/runIconHandler";
import { showError, wrapError } from "./error/common";
import { ExtensionErrors, ExtensionSource } from "./error/error";
import { core, isTeamsFxProject, tools, workspaceUri } from "./globalVariables";
import { createNewProjectHandler } from "./handlers/lifecycleHandlers";
import { processResult, runCommand } from "./handlers/sharedOpts";
import { TeamsAppMigrationHandler } from "./migration/migrationHandler";
import { VS_CODE_UI } from "./qm/vsc_ui";
import { ExtTelemetry } from "./telemetry/extTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
  TelemetryTriggerFrom,
  TelemetryUpdateAppReason,
} from "./telemetry/extTelemetryEvents";
import { acpInstalled, openFolderInExplorer } from "./utils/commonUtils";
import { localize } from "./utils/localizeUtils";
import { triggerV3Migration } from "./utils/migrationUtils";
import { getSystemInputs } from "./utils/systemEnvUtils";
import { getTriggerFromProperty } from "./utils/telemetryUtils";

export async function selectAndDebugHandler(args?: any[]): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.RunIconDebugStart, getTriggerFromProperty(args));
  const result = await selectAndDebug();
  await processResult(TelemetryEvent.RunIconDebug, result);
  return result;
}

export async function treeViewLocalDebugHandler(): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.TreeViewLocalDebug);
  await vscode.commands.executeCommand("workbench.action.quickOpen", "debug ");

  return ok(null);
}

export async function treeViewPreviewHandler(...args: any[]): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.TreeViewPreviewStart,
    getTriggerFromProperty(args)
  );
  const properties: { [key: string]: string } = {};

  try {
    const env = args[1]?.identifier as string;
    const inputs = getSystemInputs();
    inputs.env = env;
    properties[TelemetryProperty.Env] = env;

    const result = await core.previewWithManifest(inputs);
    if (result.isErr()) {
      throw result.error;
    }

    const hub = inputs[QuestionNames.M365Host] as Hub;
    const url = result.value;
    properties[TelemetryProperty.Hub] = hub;

    await openHubWebClient(hub, url);
  } catch (error) {
    const assembledError = assembleError(error);
    void showError(assembledError);
    ExtTelemetry.sendTelemetryErrorEvent(
      TelemetryEvent.TreeViewPreview,
      assembledError,
      properties
    );
    return err(assembledError);
  }

  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.TreeViewPreview, {
    [TelemetryProperty.Success]: TelemetrySuccess.Yes,
    ...properties,
  });
  return ok(null);
}

export function openFolderHandler(...args: unknown[]): Promise<Result<unknown, FxError>> {
  const scheme = "file://";
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.OpenFolder, {
    [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.Notification,
  });
  if (args && args.length > 0 && args[0]) {
    let path = args[0] as string;
    if (path.startsWith(scheme)) {
      path = path.substring(scheme.length);
    }
    const uri = vscode.Uri.file(path);
    openFolderInExplorer(uri.fsPath);
  }
  return Promise.resolve(ok(null));
}

export async function validateAzureDependenciesHandler(): Promise<string | undefined> {
  try {
    await triggerV3Migration();
    return undefined;
  } catch (error: any) {
    void showError(error as FxError);
    return "1";
  }
}

/**
 * Check & install required local prerequisites before local debug.
 */
export async function validateLocalPrerequisitesHandler(): Promise<string | undefined> {
  try {
    await triggerV3Migration();
    return undefined;
  } catch (error: any) {
    void showError(error as FxError);
    return "1";
  }
}

/*
 * Prompt window to let user install the app in Teams
 */
export async function installAppInTeams(): Promise<string | undefined> {
  try {
    await triggerV3Migration();
    return undefined;
  } catch (error: any) {
    void showError(error as FxError);
    return "1";
  }
}

/**
 * Check required prerequisites in Get Started Page.
 */
export async function validateGetStartedPrerequisitesHandler(
  ...args: unknown[]
): Promise<Result<unknown, FxError>> {
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.ClickValidatePrerequisites,
    getTriggerFromProperty(args)
  );
  const result = await checkPrerequisitesForGetStarted();
  if (result.isErr()) {
    void showError(result.error);
    // // return non-zero value to let task "exit ${command:xxx}" to exit
    // return "1";
  }
  return result;
}

/**
 * install functions binding before launch local debug
 */
export async function backendExtensionsInstallHandler(): Promise<string | undefined> {
  try {
    await triggerV3Migration();
    return undefined;
  } catch (error: any) {
    void showError(error as FxError);
    return "1";
  }
}

/**
 * Get path delimiter
 * Usage like ${workspaceFolder}/devTools/func${command:...}${env:PATH}
 */
export function getPathDelimiterHandler(): string {
  return path.delimiter;
}

/**
 * Get dotnet path to be referenced by task definition.
 * Usage like ${command:...}${env:PATH} so need to include delimiter as well
 */
export async function getDotnetPathHandler(): Promise<string> {
  try {
    const depsManager = new DepsManager(vscodeLogger, vscodeTelemetry);
    const dotnetStatus = (await depsManager.getStatus([DepsType.Dotnet]))?.[0];
    if (dotnetStatus?.isInstalled && dotnetStatus?.details?.binFolders !== undefined) {
      return `${path.delimiter}${dotnetStatus.details.binFolders
        .map((f: string) => path.dirname(f))
        .join(path.delimiter)}${path.delimiter}`;
    }
  } catch (error: any) {
    void showError(assembleError(error));
  }

  return `${path.delimiter}`;
}

/**
 * call localDebug on core
 */
export async function preDebugCheckHandler(): Promise<string | undefined> {
  try {
    await triggerV3Migration();
    return undefined;
  } catch (error: any) {
    void showError(error as FxError);
    return "1";
  }
}

export async function checkUpgrade(args?: any[]) {
  const triggerFrom = getTriggerFromProperty(args);
  const input = getSystemInputs();
  if (triggerFrom?.[TelemetryProperty.TriggerFrom] === TelemetryTriggerFrom.Auto) {
    input["isNonmodalMessage"] = true;
    // not await here to avoid blocking the UI.
    void core.phantomMigrationV3(input).then((result) => {
      if (result.isErr()) {
        void showError(result.error);
      }
    });
    return;
  } else if (
    triggerFrom[TelemetryProperty.TriggerFrom] &&
    (triggerFrom[TelemetryProperty.TriggerFrom] === TelemetryTriggerFrom.SideBar ||
      triggerFrom[TelemetryProperty.TriggerFrom] === TelemetryTriggerFrom.CommandPalette)
  ) {
    input["skipUserConfirm"] = true;
  }
  const result = await core.phantomMigrationV3(input);
  if (result.isErr()) {
    void showError(result.error);
  }
}

export async function openSamplesHandler(...args: unknown[]): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Samples, getTriggerFromProperty(args));
  WebviewPanel.createOrShow(PanelType.SampleGallery, args);
  return Promise.resolve(ok(null));
}

export function saveTextDocumentHandler(document: vscode.TextDocumentWillSaveEvent) {
  if (!isValidProject(workspaceUri?.fsPath)) {
    return;
  }

  let reason: TelemetryUpdateAppReason | undefined = undefined;
  switch (document.reason) {
    case vscode.TextDocumentSaveReason.Manual:
      reason = TelemetryUpdateAppReason.Manual;
      break;
    case vscode.TextDocumentSaveReason.AfterDelay:
      reason = TelemetryUpdateAppReason.AfterDelay;
      break;
    case vscode.TextDocumentSaveReason.FocusOut:
      reason = TelemetryUpdateAppReason.FocusOut;
      break;
  }

  let curDirectory = path.dirname(document.document.fileName);
  while (curDirectory) {
    if (isValidProject(curDirectory)) {
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.UpdateTeamsApp, {
        [TelemetryProperty.UpdateTeamsAppReason]: reason,
      });
      return;
    }

    if (curDirectory === path.join(curDirectory, "..")) {
      break;
    }
    curDirectory = path.join(curDirectory, "..");
  }
}

export async function installAdaptiveCardExt(
  ...args: unknown[]
): Promise<Result<unknown, FxError>> {
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.AdaptiveCardPreviewerInstall,
    getTriggerFromProperty(args)
  );
  if (acpInstalled()) {
    await vscode.window.showInformationMessage(
      localize("teamstoolkit.handlers.adaptiveCardExtUsage")
    );
  } else {
    const selection = await vscode.window.showInformationMessage(
      localize("teamstoolkit.handlers.installAdaptiveCardExt"),
      "Install",
      "Cancel"
    );
    if (selection === "Install") {
      ExtTelemetry.sendTelemetryEvent(
        TelemetryEvent.AdaptiveCardPreviewerInstallConfirm,
        getTriggerFromProperty(args)
      );
      await vscode.commands.executeCommand(
        "workbench.extensions.installExtension",
        "TeamsDevApp.vscode-adaptive-cards"
      );
    } else {
      ExtTelemetry.sendTelemetryEvent(
        TelemetryEvent.AdaptiveCardPreviewerInstallCancel,
        getTriggerFromProperty(args)
      );
    }
  }
  return Promise.resolve(ok(null));
}

export async function copilotPluginAddAPIHandler(args: any[]) {
  // Telemetries are handled in runCommand()
  const inputs = getSystemInputs();
  if (args && args.length > 0) {
    const filePath = args[0].fsPath as string;
    const isFromApiPlugin: boolean = args[0].isFromApiPlugin ?? false;
    if (!isFromApiPlugin) {
      // Codelens for API ME. Trigger from manifest.json
      inputs[QuestionNames.ManifestPath] = filePath;
    } else {
      inputs[QuestionNames.Capabilities] = CapabilityOptions.copilotPluginApiSpec().id;
      inputs[QuestionNames.DestinationApiSpecFilePath] = filePath;
      inputs[QuestionNames.ManifestPath] = args[0].manifestPath;
    }
  }
  const result = await runCommand(Stage.copilotPluginAddAPI, inputs);
  return result;
}

export async function openLifecycleTreeview(args?: any[]) {
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.ClickOpenLifecycleTreeview,
    getTriggerFromProperty(args)
  );
  if (isTeamsFxProject) {
    await vscode.commands.executeCommand("teamsfx-lifecycle.focus");
  } else {
    await vscode.commands.executeCommand("workbench.view.extension.teamsfx");
  }
}
