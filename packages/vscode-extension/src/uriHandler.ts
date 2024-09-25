// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as queryString from "query-string";
import * as vscode from "vscode";

import { codeSpacesAuthComplete } from "./commonlib/common/constant";
import { localize } from "./utils/localizeUtils";
import { TelemetryTriggerFrom } from "./telemetry/extTelemetryEvents";
import { featureFlagManager, FeatureFlags } from "@microsoft/teamsfx-core";

export let uriEventHandler: UriHandler;

enum Referrer {
  DeveloperPortal = "developerportal",
  OfficeDoc = "officedoc",
  SyncManifest = "syncmanifest",
}

interface QueryParams {
  appId?: string;
  referrer?: string;
  login_hint?: string;
  sampleId?: string;
}

let isRunning = false;
export class UriHandler extends vscode.EventEmitter<vscode.Uri> implements vscode.UriHandler {
  handleUri(uri: vscode.Uri): vscode.ProviderResult<void> {
    if (uri.path === "/" + codeSpacesAuthComplete) {
      this.fire(uri);
      return;
    }

    if (!uri.query) {
      void vscode.window.showErrorMessage(
        localize("teamstoolkit.devPortalIntegration.invalidLink")
      );
      return;
    }
    const queryParamas = queryString.parse(uri.query) as QueryParams;
    if (!queryParamas.referrer) {
      void vscode.window.showErrorMessage(
        localize("teamstoolkit.devPortalIntegration.invalidLink")
      );
      return;
    }

    if (queryParamas.referrer === Referrer.DeveloperPortal) {
      if (isRunning) {
        void vscode.window.showWarningMessage(
          localize("teamstoolkit.devPortalIntegration.blockingMessage")
        );
        return;
      }
      if (!queryParamas.appId) {
        void vscode.window.showErrorMessage(
          localize("teamstoolkit.devPortalIntegration.invalidLink")
        );
        return;
      }

      isRunning = true;
      vscode.commands
        .executeCommand("fx-extension.openFromTdp", queryParamas.appId, queryParamas.login_hint)
        .then(
          () => {
            isRunning = false;
          },
          () => {
            isRunning = false;
          }
        );
      return;
    }

    if (queryParamas.referrer === Referrer.OfficeDoc) {
      if (!queryParamas.sampleId) {
        void vscode.window.showErrorMessage(
          localize("teamstoolkit.devPortalIntegration.invalidLink")
        );
        return;
      }
      void vscode.commands.executeCommand(
        "fx-extension.openSamples",
        TelemetryTriggerFrom.ExternalUrl,
        queryParamas.sampleId
      );
      return;
    }
    if (
      queryParamas.referrer === Referrer.SyncManifest &&
      featureFlagManager.getBooleanValue(FeatureFlags.SyncManifest)
    ) {
      if (!queryParamas.appId) {
        void vscode.window.showErrorMessage(
          localize("teamstoolkit.devPortalIntegration.invalidLink")
        );
        return;
      }
      void vscode.commands.executeCommand("fx-extension.syncManifest", queryParamas.appId);
      return;
    }
  }
}

export function setUriEventHandler(uriHandler: UriHandler) {
  uriEventHandler = uriHandler;
}
