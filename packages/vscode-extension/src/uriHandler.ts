// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as queryString from "query-string";
import * as vscode from "vscode";

import { codeSpacesAuthComplete } from "./commonlib/common/constant";
import { localize } from "./utils/localizeUtils";

enum Referrer {
  DeveloperPortal = "developerportal",
}
interface QueryParams {
  appId?: string;
  referrer?: string;
  login_hint?: string;
}

let isRunning = false;
export class UriHandler extends vscode.EventEmitter<vscode.Uri> implements vscode.UriHandler {
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
