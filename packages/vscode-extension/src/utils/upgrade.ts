// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";
import * as versionUtil from "./versionUtil";
import { SyncedState, UserState } from "../constants";
import * as util from "util";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { TelemetryEvent } from "../telemetry/extTelemetryEvents";
import * as folder from "../folder";
import { localize } from "./localizeUtils";

export class ExtensionUpgrade {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public async showChangeLog() {
    const extensionId = versionUtil.getExtensionId();
    const teamsToolkit = vscode.extensions.getExtension(extensionId) as {
      packageJSON: { version: string };
    };
    const teamsToolkitVersion = teamsToolkit.packageJSON.version;
    const syncedVersion = this.context.globalState.get<string>(SyncedState.Version);

    if (
      syncedVersion === undefined ||
      versionUtil.compare(teamsToolkitVersion, syncedVersion) === 1
    ) {
      // if syncedVersion is undefined, then it is not existinig user
      await this.context.globalState.update(
        UserState.IsExisting,
        syncedVersion === undefined ? "no" : "yes"
      );
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ShowWhatIsNewNotification);
      await this.context.globalState.update(SyncedState.Version, teamsToolkitVersion);

      const changelog = {
        title: localize("teamstoolkit.upgrade.changelog"),
        run: async (): Promise<void> => {
          const uri = vscode.Uri.file(`${folder.getResourceFolder()}/CHANGELOG.md`);
          await vscode.workspace.openTextDocument(uri);
          const PreviewMarkdownCommand = "markdown.showPreview";
          await vscode.commands.executeCommand(PreviewMarkdownCommand, uri);
        },
      };

      void vscode.window
        .showInformationMessage(
          util.format(localize("teamstoolkit.upgrade.banner"), teamsToolkitVersion),
          changelog
        )
        .then(async (selection) => {
          if (selection?.title === localize("teamstoolkit.upgrade.changelog")) {
            ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ShowWhatIsNewContext);
            await selection.run();
          }
        });
    }
  }
}
