import { commands, Uri, workspace, ExtensionContext, MessageItem } from "vscode";
import * as versionUtil from "./versionUtil";
import { SyncedState } from "../constants";
import * as path from "path";

export class ExtensionUpgrade {
  private context: ExtensionContext;

  constructor(context: ExtensionContext) {
    this.context = context;
  }

  public async showChangeLog() {
    const extensionId = "TeamsDevApp.ms-teams-vscode-extension";
    const teamsToolkit = vscode.extensions.getExtension(extensionId);
    const teamsToolkitVersion = teamsToolkit?.packageJSON.version;
    const syncedVersion = this.context.globalState.get<string>(SyncedState.Version);

    if (syncedVersion === undefined) {
      //show change log
    } else if (versionUtil.compare(teamsToolkitVersion, syncedVersion) > 1) {
      const whatIsNew = {
        title: "StringResources.vsc.migrateV1.learnMore.title",
        run: async (): Promise<void> => {
          const uri = Uri.file(`${this.getResourceDir()}/CHANGELOG.md`);
          workspace.openTextDocument(uri).then(() => {
            const PreviewMarkdownCommand = "markdown.showPreview";
            commands.executeCommand(PreviewMarkdownCommand, uri);
          });
        },
      };

      // vscode.window
      // .showInformationMessage("Teams Toolkit has been updated to v11.6.0 — check out what's new!", whatIsNew, confirm)
      // .then((selection) => {
      //   if (selection?.title === StringResources.vsc.migrateV1.confirm.title) {
      //     ExtTelemetry.sendTelemetryEvent(TelemetryEvent.MigrateV1ProjectNotification, {
      //       status: StringResources.vsc.migrateV1.confirm.status,
      //     });
      //     selection.run();
      //   }
      // });
    }

    teamsToolkit?.packageJSON.version;
  }

  private getResourceDir(): string {
    return path.resolve(__dirname, "resource");
  }

  private getChangeLogFilePath(): string {
    return path.join(this.getResourceDir(), "CHANGELOG.md");
  }

  private async showWhatsNewMessage(version: string) {
    const actions: MessageItem[] = [{ title: "What's New" }, { title: "❤ Sponsor" }];

    // const result = await vscode.sh.showMessage(
    // 	'info',
    // 	`GitLens has been updated to v${version} — check out what's new!`,
    // 	undefined,
    // 	null,
    // 	...actions,
    // );

    // if (result != null) {
    // 	if (result === actions[0]) {
    // 		await env.openExternal(Uri.parse('https://gitlens.amod.io/#whats-new'));
    // 	} else if (result === actions[1]) {
    // 		await env.openExternal(Uri.parse('https://gitlens.amod.io/#sponsor'));
    // 	}
    // }
  }
}
