import { isTDPIntegrationEnabled } from "@microsoft/teamsfx-core/build/common/featureFlags";
import * as vscode from "vscode";

export class UriHandler implements vscode.UriHandler {
  handleUri(uri: vscode.Uri): vscode.ProviderResult<void> {
    if (isTDPIntegrationEnabled()) {
      // TODO: add logic to handle based on uri query
      vscode.window.showInformationMessage("Opened Teams Toolkit Extension!");
    }
  }
}
