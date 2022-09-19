import { Result, FxError, err, ok, UserError } from "@microsoft/teamsfx-api";
import { isValidProject } from "@microsoft/teamsfx-core/build/common/projectSettingsHelper";
import * as globalVariables from "../globalVariables";
import { ExtensionErrors, ExtensionSource } from "../error";
import * as vscode from "vscode";
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

export function registerRunIcon(): void {
  globalVariables.context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(enableRunIcon)
  );
  enableRunIcon();
}

function enableRunIcon(): void {
  const validProject =
    globalVariables.workspaceUri && isValidProject(globalVariables.workspaceUri.fsPath);
  vscode.commands.executeCommand("setContext", "fx-extension.runIconActive", validProject);
}

export function disableRunIcon(): void {
  vscode.commands.executeCommand("setContext", "fx-extension.runIconActive", false);
}
