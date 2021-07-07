import { Result, FxError, err, ok, returnUserError } from "@microsoft/teamsfx-api";
import { isValidProject } from "@microsoft/teamsfx-core";
import { ext } from "../extensionVariables";
import { ExtensionErrors, ExtensionSource } from "../error";
import * as vscode from "vscode";
import * as StringResources from "../resources/Strings.json";

export async function selectAndDebug(): Promise<Result<null, FxError>> {
  if (ext.workspaceUri && isValidProject(ext.workspaceUri.fsPath)) {
    await vscode.commands.executeCommand("workbench.view.debug");
    await vscode.commands.executeCommand("workbench.action.debug.selectandstart");
    return ok(null);
  } else {
    const error = returnUserError(
      new Error(StringResources.vsc.handlers.invalidProject),
      ExtensionSource,
      ExtensionErrors.InvalidProject
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
