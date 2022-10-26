import { isTDPIntegrationEnabled } from "@microsoft/teamsfx-core/build/common/featureFlags";
import * as vscode from "vscode";
import * as queryString from "query-string";
import { localize } from "./utils/localizeUtils";

interface QueryParams {
  appId?: string;
}

let isRunning = false;
export class UriHandler implements vscode.UriHandler {
  handleUri(uri: vscode.Uri): vscode.ProviderResult<void> {
    if (isTDPIntegrationEnabled()) {
      if (isRunning) {
        vscode.window.showWarningMessage(
          localize("teamstoolkit.devPortalIntegration.blockingMessage")
        );
        return;
      }
      if (!uri.query) {
        vscode.window.showErrorMessage(localize("teamstoolkit.devPortalIntegration.invalidLink"));
        return;
      }
      const queryParamas = queryString.parse(uri.query) as QueryParams;
      if (!queryParamas.appId) {
        vscode.window.showErrorMessage(localize("teamstoolkit.devPortalIntegration.invalidLink"));
        return;
      }

      isRunning = true;
      vscode.commands.executeCommand("fx-extension.openFromTdp", queryParamas.appId).then(() => {
        isRunning = false;
      });
    }
  }
}
