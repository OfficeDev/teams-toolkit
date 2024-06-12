// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { Inputs, Platform, VsCodeEnv } from "@microsoft/teamsfx-api";
import { workspaceUri } from "../globalVariables";
import { loadedLocale } from "./localizeUtils";

export function detectVsCodeEnv(): VsCodeEnv {
  // extensionKind returns ExtensionKind.UI when running locally, so use this to detect remote
  const extension = vscode.extensions.getExtension("TeamsDevApp.ms-teams-vscode-extension");

  if (extension?.extensionKind === vscode.ExtensionKind.Workspace) {
    // running remotely
    // Codespaces browser-based editor will return UIKind.Web for uiKind
    if (vscode.env.uiKind === vscode.UIKind.Web) {
      return VsCodeEnv.codespaceBrowser;
    } else if (vscode.env.remoteName === "codespaces") {
      return VsCodeEnv.codespaceVsCode;
    } else {
      return VsCodeEnv.remote;
    }
  } else {
    // running locally
    return VsCodeEnv.local;
  }
}

export function getSystemInputs(): Inputs {
  const answers: Inputs = {
    projectPath: workspaceUri?.fsPath,
    platform: Platform.VSCode,
    vscodeEnv: detectVsCodeEnv(),
    locale: loadedLocale,
  };
  return answers;
}
