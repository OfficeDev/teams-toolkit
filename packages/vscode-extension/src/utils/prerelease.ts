// Copyright (c) Microsoft Corporation.
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
      (teamsToolkitVersion &&
        versionUtil.isPrereleaseVersion(teamsToolkitVersion) &&
        teamsToolkitVersion != prereleaseVersion)
    ) {
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ShowWhatIsNewNotification);
      await this.context.globalState.update(PrereleaseState.Version, teamsToolkitVersion);
      await this.show();
    }
  }
  public async show() {
    const uri = vscode.Uri.file(`${folder.getResourceFolder()}/PRERELEASE.md`);
    await vscode.workspace.openTextDocument(uri);
    const PreviewMarkdownCommand = "markdown.showPreview";
    await vscode.commands.executeCommand(PreviewMarkdownCommand, uri);
  }
  public getTeamsToolkitVersion(): string | undefined {
    const extensionId = versionUtil.getExtensionId();
    const teamsToolkit = vscode.extensions.getExtension(extensionId);
    return teamsToolkit?.packageJSON.version;
  }
}
