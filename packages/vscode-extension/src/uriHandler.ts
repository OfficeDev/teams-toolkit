import { isV3Enabled } from "@microsoft/teamsfx-core";
import * as vscode from "vscode";
import * as queryString from "query-string";
import { localize } from "./utils/localizeUtils";
import * as util from "util";
import { SwitchToPreReleaseVersionLink } from "./constants";

enum Referrer {
  DeveloperPortal = "developerportal",
}
interface QueryParams {
  appId?: string;
  referrer?: string;
  login_hint?: string;
}

let isRunning = false;
export class UriHandler implements vscode.UriHandler {
  handleUri(uri: vscode.Uri): vscode.ProviderResult<void> {
    if (isRunning) {
      vscode.window.showWarningMessage(
        localize("teamstoolkit.devPortalIntegration.blockingMessage")
      );
      return;
    }

    if (!isV3Enabled()) {
      console.log("not v3");
      vscode.window.showErrorMessage(
        util.format(
          localize("teamstoolkit.devPortalIntegration.installPreReleaseWarning"),
          SwitchToPreReleaseVersionLink
        )
      );
      return;
    }

    if (!uri.query) {
      console.log("not query");
      vscode.window.showErrorMessage(localize("teamstoolkit.devPortalIntegration.invalidLink"));
      return;
    }
    const queryParamas = queryString.parse(uri.query) as QueryParams;
    if (!queryParamas.referrer) {
      console.log("not referrer");
      vscode.window.showErrorMessage(localize("teamstoolkit.devPortalIntegration.invalidLink"));
      return;
    }

    if (queryParamas.referrer === Referrer.DeveloperPortal) {
      if (!queryParamas.appId) {
        console.log("not id");
        vscode.window.showErrorMessage(localize("teamstoolkit.devPortalIntegration.invalidLink"));
        return;
      }

      isRunning = true;
      vscode.commands
        .executeCommand("fx-extension.openFromTdp", queryParamas.appId, queryParamas.login_hint)
        .then(() => {
          isRunning = false;
        });
    }
  }
}
