// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import * as util from "util";
import * as vscode from "vscode";
import * as fs from "fs-extra";
import {
  Warning,
  AppPackageFolderName,
  ManifestTemplateFileName,
  ManifestUtil,
} from "@microsoft/teamsfx-api";
import {
  assembleError,
  JSONSyntaxError,
  manifestUtils,
  pluginManifestUtils,
  generateScaffoldingSummary,
  globalStateGet,
  globalStateUpdate,
} from "@microsoft/teamsfx-core";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { TelemetryEvent, TelemetryTriggerFrom } from "../telemetry/extTelemetryEvents";
import VsCodeLogInstance from "../commonlib/log";
import { GlobalKey, CommandKey } from "../constants";
import { selectAndDebug } from "../debug/runIconHandler";
import { workspaceUri } from "../globalVariables";
import { getAppName } from "./appDefinitionUtils";
import { getLocalDebugMessageTemplate } from "./commonUtils";
import { localize } from "./localizeUtils";
import { VS_CODE_UI } from "../qm/vsc_ui";

export async function showLocalDebugMessage() {
  const shouldShowLocalDebugMessage = (await globalStateGet(
    GlobalKey.ShowLocalDebugMessage,
    false
  )) as boolean;

  if (!shouldShowLocalDebugMessage) {
    return;
  } else {
    await globalStateUpdate(GlobalKey.ShowLocalDebugMessage, false);
  }

  const hasLocalEnv = await fs.pathExists(path.join(workspaceUri!.fsPath, "teamsapp.local.yml"));

  const appName = (await getAppName()) ?? localize("teamstoolkit.handlers.fallbackAppName");
  const isWindows = process.platform === "win32";
  const folderLink = encodeURI(workspaceUri!.toString());
  const openFolderCommand = `command:fx-extension.openFolder?%5B%22${folderLink}%22%5D`;

  if (hasLocalEnv) {
    const localDebug = {
      title: localize("teamstoolkit.handlers.localDebugTitle"),
      run: async (): Promise<void> => {
        await selectAndDebug();
      },
    };
    ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ShowLocalDebugNotification);

    const messageTemplate = await getLocalDebugMessageTemplate(isWindows);

    let message = util.format(messageTemplate, appName, workspaceUri?.fsPath);
    if (isWindows) {
      message = util.format(messageTemplate, appName, openFolderCommand);
    }
    void vscode.window.showInformationMessage(message, localDebug).then((selection) => {
      if (selection?.title === localize("teamstoolkit.handlers.localDebugTitle")) {
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ClickLocalDebug);
        void selection.run();
      }
    });
  } else {
    const provision = {
      title: localize("teamstoolkit.handlers.provisionTitle"),
      run: async (): Promise<void> => {
        await vscode.commands.executeCommand(CommandKey.Provision, [
          TelemetryTriggerFrom.Notification,
        ]);
      },
    };
    ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ShowProvisionNotification);
    const message = isWindows
      ? util.format(
          localize("teamstoolkit.handlers.provisionDescription"),
          appName,
          openFolderCommand
        )
      : util.format(
          localize("teamstoolkit.handlers.provisionDescription.fallback"),
          appName,
          workspaceUri?.fsPath
        );
    void vscode.window.showInformationMessage(message, provision).then((selection) => {
      if (selection?.title === localize("teamstoolkit.handlers.provisionTitle")) {
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ClickProvision);
        void selection.run();
      }
    });
  }
}

export async function ShowScaffoldingWarningSummary(
  workspacePath: string,
  warning: string
): Promise<void> {
  try {
    let createWarnings: Warning[] = [];

    if (warning) {
      try {
        createWarnings = JSON.parse(warning) as Warning[];
      } catch (e) {
        const error = new JSONSyntaxError(warning, e, "vscode");
        ExtTelemetry.sendTelemetryErrorEvent(
          TelemetryEvent.ShowScaffoldingWarningSummaryError,
          error
        );
      }
    }
    const manifestRes = await manifestUtils._readAppManifest(
      path.join(workspacePath, AppPackageFolderName, ManifestTemplateFileName)
    );
    let message;
    if (manifestRes.isOk()) {
      const teamsManifest = manifestRes.value;
      const commonProperties = ManifestUtil.parseCommonProperties(teamsManifest);
      if (commonProperties.capabilities.includes("plugin")) {
        const apiSpecFilePathRes = await pluginManifestUtils.getApiSpecFilePathFromTeamsManifest(
          teamsManifest,
          path.join(workspacePath, AppPackageFolderName, ManifestTemplateFileName)
        );
        if (apiSpecFilePathRes.isErr()) {
          ExtTelemetry.sendTelemetryErrorEvent(
            TelemetryEvent.ShowScaffoldingWarningSummaryError,
            apiSpecFilePathRes.error
          );
        } else {
          message = generateScaffoldingSummary(
            createWarnings,
            teamsManifest,
            path.relative(workspacePath, apiSpecFilePathRes.value[0])
          );
        }
      }
      if (commonProperties.isApiME) {
        message = generateScaffoldingSummary(
          createWarnings,
          manifestRes.value,
          teamsManifest.composeExtensions?.[0].apiSpecificationFile ?? ""
        );
      }

      if (message) {
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ShowScaffoldingWarningSummary);
        VsCodeLogInstance.outputChannel.show();
        void VsCodeLogInstance.info(message);
      }
    } else {
      ExtTelemetry.sendTelemetryErrorEvent(
        TelemetryEvent.ShowScaffoldingWarningSummaryError,
        manifestRes.error
      );
    }
  } catch (e) {
    const error = assembleError(e);
    ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.ShowScaffoldingWarningSummaryError, error);
  }
}

export async function autoInstallDependencyHandler() {
  await VS_CODE_UI.runCommand({
    cmd: "npm i",
    workingDirectory: "${workspaceFolder}/src",
    shellName: localize("teamstoolkit.handlers.autoInstallDependency"),
    iconPath: "cloud-download",
  });
}
