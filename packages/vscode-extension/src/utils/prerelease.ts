// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as vscode from "vscode";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { TelemetryEvent } from "../telemetry/extTelemetryEvents";
import * as versionUtil from "./versionUtil";
import { PrereleaseState } from "../constants";
import * as folder from "../folder";

export class PrereleasePage {
  private context: vscode.ExtensionContext;
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }
  public async checkAndShow() {
    const teamsToolkitVersion = this.getTeamsToolkitVersion();
    const prereleaseVersion = this.context.globalState.get<string>(PrereleaseState.Version);
    if (
      prereleaseVersion === undefined ||
      (versionUtil.isPrereleaseVersion(teamsToolkitVersion) &&
        teamsToolkitVersion != prereleaseVersion)
    ) {
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ShowWhatIsNewNotification);
      this.context.globalState.update(PrereleaseState.Version, teamsToolkitVersion);
      this.show();
    }
  }
  public async show() {
    const uri = vscode.Uri.file(`${folder.getResourceFolder()}/PRERELEASE.md`);
    vscode.workspace.openTextDocument(uri).then(() => {
      const PreviewMarkdownCommand = "markdown.showPreview";
      vscode.commands.executeCommand(PreviewMarkdownCommand, uri);
    });
  }
  public getTeamsToolkitVersion(): any {
    const extensionId = versionUtil.getExtensionId();
    const teamsToolkit = vscode.extensions.getExtension(extensionId);
    return teamsToolkit?.packageJSON.version;
  }
}
