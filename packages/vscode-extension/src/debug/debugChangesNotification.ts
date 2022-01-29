// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { LocalEnvManager } from "@microsoft/teamsfx-core";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import VsCodeLogInstance from "../commonlib/log";
import { ext } from "../extensionVariables";
import { vscodeHelper } from "./depsChecker/vscodeHelper";
import { VS_CODE_UI } from "../extension";
import * as StringResources from "../resources/Strings.json";
import {
  skipNgrokHelpLink,
  skipNgrokRetiredNotification,
  trustDevCertHelpLink,
  trustDevCertRetiredNotification,
} from "./constants";
import { commands } from "vscode";

// TODO: remove the notification
export async function showDebugChangesNotification(): Promise<void> {
  const localEnvManager = new LocalEnvManager(VsCodeLogInstance, ExtTelemetry.reporter);
  if (!ext.workspaceUri?.fsPath) {
    return;
  }
  const localSettings = await localEnvManager.getLocalSettings(ext.workspaceUri.fsPath);
  if (localSettings?.frontend?.trustDevCert === false && vscodeHelper.isTrustDevCertEnabled()) {
    showNotification(trustDevCertRetiredNotification, trustDevCertHelpLink);
  }

  if (localSettings?.bot?.skipNgrok === true && vscodeHelper.isNgrokCheckerEnabled()) {
    showNotification(skipNgrokRetiredNotification, skipNgrokHelpLink);
  }
}

function showNotification(message: string, url: string): void {
  VS_CODE_UI.showMessage(
    "warn",
    message,
    false,
    StringResources.vsc.localDebug.openSettings,
    StringResources.vsc.localDebug.learnMore
  ).then(async (result) => {
    if (result.isOk()) {
      if (result.value === StringResources.vsc.localDebug.learnMore) {
        await VS_CODE_UI.openUrl(url);
      }
      if (result.value === StringResources.vsc.localDebug.openSettings) {
        await commands.executeCommand(
          "workbench.action.openSettings",
          "fx-extension.prerequisiteCheck"
        );
      }
    }
  });
}
