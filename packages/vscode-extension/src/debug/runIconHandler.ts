// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FxError, Result, UserError, err, ok } from "@microsoft/teamsfx-api";
import { isValidProject } from "@microsoft/teamsfx-core";
import * as vscode from "vscode";
import { ExtensionErrors, ExtensionSource } from "../error";
import * as globalVariables from "../globalVariables";
import { getDefaultString, localize } from "../utils/localizeUtils";

export async function selectAndDebug(): Promise<Result<null, FxError>> {
  if (globalVariables.workspaceUri && isValidProject(globalVariables.workspaceUri.fsPath)) {
    await vscode.commands.executeCommand("workbench.view.debug");
    await vscode.commands.executeCommand("workbench.action.debug.selectandstart");
    return ok(null);
  } else {
    const error = new UserError(
      ExtensionSource,
      ExtensionErrors.InvalidProject,
      getDefaultString("teamstoolkit.handlers.invalidProject"),
      localize("teamstoolkit.handlers.invalidProject")
    );

    return err(error);
  }
}

export async function registerRunIcon(): Promise<void> {
  globalVariables.context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(enableRunIcon)
  );
  await enableRunIcon();
}

async function enableRunIcon(): Promise<void> {
  const validProject =
    globalVariables.workspaceUri && isValidProject(globalVariables.workspaceUri.fsPath);
  await vscode.commands.executeCommand("setContext", "fx-extension.runIconActive", validProject);
}

export async function disableRunIcon(): Promise<void> {
  await vscode.commands.executeCommand("setContext", "fx-extension.runIconActive", false);
}
