import { isV3Enabled } from "@microsoft/teamsfx-core";
import * as vscode from "vscode";
import * as queryString from "query-string";
import { localize } from "./utils/localizeUtils";
import * as util from "util";
import { SwitchToPreReleaseVersionLink } from "./constants";
import { EventEmitter, Uri } from "vscode";
import { codeSpacesAuthComplete } from "./commonlib/common/constant";

enum Referrer {
  DeveloperPortal = "developerportal",
}
interface QueryParams {
  appId?: string;
  referrer?: string;
  login_hint?: string;
}

let isRunning = false;
export class UriHandler extends EventEmitter<Uri> implements vscode.UriHandler {
  handleUri(uri: vscode.Uri): vscode.ProviderResult<void> {
    if (uri.path === "/" + codeSpacesAuthComplete) {
      this.fire(uri);
      return;
    }
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
    if (!queryParamas.referrer) {
      vscode.window.showErrorMessage(localize("teamstoolkit.devPortalIntegration.invalidLink"));
      return;
    }

    if (queryParamas.referrer === Referrer.DeveloperPortal) {
      if (!isV3Enabled()) {
        vscode.window.showErrorMessage(
          util.format(
            localize("teamstoolkit.devPortalIntegration.installPreReleaseWarning"),
            SwitchToPreReleaseVersionLink
          )
        );
        return;
      }

      if (!queryParamas.appId) {
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
