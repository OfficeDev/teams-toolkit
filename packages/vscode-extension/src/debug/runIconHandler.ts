import { Result, FxError, err, ok, UserError } from "@microsoft/teamsfx-api";
import { isValidProject } from "@microsoft/teamsfx-core";
import { ext } from "../extensionVariables";
import { ExtensionErrors, ExtensionSource } from "../error";
import * as vscode from "vscode";
import { localize } from "../utils/localizeUtils";

export async function selectAndDebug(): Promise<Result<null, FxError>> {
  if (ext.workspaceUri && isValidProject(ext.workspaceUri.fsPath)) {
    await vscode.commands.executeCommand("workbench.view.debug");
    await vscode.commands.executeCommand("workbench.action.debug.selectandstart");
    return ok(null);
  } else {
    const error = new UserError(
      ExtensionSource,
      ExtensionErrors.InvalidProject,
      localize("teamstoolkit.handlers.invalidProject")
    );

    return err(error);
  }
}

export function registerRunIcon(): void {
  ext.context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(enableRunIcon));
  enableRunIcon();
}

function enableRunIcon(): void {
  const validProject = ext.workspaceUri && isValidProject(ext.workspaceUri.fsPath);
  vscode.commands.executeCommand("setContext", "fx-extension.runIconActive", validProject);
}

export function disableRunIcon(): void {
  vscode.commands.executeCommand("setContext", "fx-extension.runIconActive", false);
}
