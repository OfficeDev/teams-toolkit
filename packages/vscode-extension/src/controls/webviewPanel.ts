// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import * as vscode from "vscode";
import { ext } from "../extensionVariables";
import { Commands } from "./Commands";
import axios from "axios";
import * as AdmZip from "adm-zip";
import * as fs from "fs-extra";
import * as uuid from "uuid";
import { glob } from "glob";
import AzureAccountManager from "../commonlib/azureLogin";
import AppStudioTokenInstance from "../commonlib/appStudioLogin";
import { runCommand } from "../handlers";
import { returnSystemError, Stage, SystemError, UserError } from "@microsoft/teamsfx-api";
import { globalStateGet, globalStateUpdate } from "@microsoft/teamsfx-core";
import { PanelType } from "./PanelType";
import { execSync } from "child_process";
import { isMacOS } from "../utils/commonUtils";
import { DialogManager } from "../userInterface";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTiggerFrom,
  TelemetrySuccess,
} from "../telemetry/extTelemetryEvents";
import { ExtensionErrors, ExtensionSource } from "../error";
import * as StringResources from "../resources/Strings.json";
import * as util from "util";
import { VS_CODE_UI } from "../extension";

export class WebviewPanel {
  private static readonly viewType = "react";
  public static currentPanels: WebviewPanel[] = [];

  private panel: vscode.WebviewPanel;
  private panelType: PanelType = PanelType.QuickStart;
  private disposables: vscode.Disposable[] = [];

  public static createOrShow(panelType: PanelType) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;
    if (
      WebviewPanel.currentPanels &&
      WebviewPanel.currentPanels.findIndex((panel) => panel.panelType === panelType) > -1
    ) {
      WebviewPanel.currentPanels
        .find((panel) => panel.panelType === panelType)!
        .panel.reveal(column);
    } else {
      WebviewPanel.currentPanels.push(new WebviewPanel(panelType, column || vscode.ViewColumn.One));
    }
  }

  private constructor(panelType: PanelType, column: vscode.ViewColumn) {
    this.panelType = panelType;

    // Create and show a new webview panel
    this.panel = vscode.window.createWebviewPanel(
      WebviewPanel.viewType,
      this.getWebpageTitle(panelType),
      column,
      {
        // Enable javascript in the webview
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.file(path.join(ext.context.extensionPath, "out"))],
      }
    );

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programatically
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(
      async (msg) => {
        switch (msg.command) {
          case Commands.OpenExternalLink:
            vscode.env.openExternal(vscode.Uri.parse(msg.data));
            break;
          case Commands.CloneSampleApp:
            await this.downloadSampleApp(msg);
            break;
          case Commands.DisplayCommands:
            vscode.commands.executeCommand("workbench.action.quickOpen", `>${msg.data}`);
            break;
          case Commands.SigninM365:
            await AppStudioTokenInstance.getJsonObject(false);
            break;
          case Commands.SigninAzure:
            vscode.commands.executeCommand("fx-extension.signinAzure", ["webview", false]);
            break;
          case Commands.CreateNewProject:
            await runCommand(Stage.create);
            break;
          case Commands.SwitchPanel:
            WebviewPanel.createOrShow(msg.data);
            break;
          case Commands.InitAccountInfo:
            this.setStatusChangeMap();
            break;
          case Commands.UpdateGlobalStepsDone:
            await this.updateGlobalStepsDone(msg.data);
            break;
          case Commands.GetGlobalStepsDone:
            this.getGlobalStepsDone();
            break;
          case Commands.SendTelemetryEvent:
            ExtTelemetry.sendTelemetryEvent(msg.data.eventName, msg.data.properties);
          default:
            break;
        }
      },
      undefined,
      ext.context.subscriptions
    );

    // Set the webview's initial html content
    this.panel.webview.html = this.getHtmlForWebview(panelType);
  }

  private async downloadSampleApp(msg: any) {
    ExtTelemetry.sendTelemetryEvent(TelemetryEvent.DownloadSampleStart, {
      [TelemetryProperty.TriggerFrom]: TelemetryTiggerFrom.Webview,
      [TelemetryProperty.SampleAppName]: msg.data.appFolder,
    });
    const folder = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      title: StringResources.vsc.webview.downloadSampleTitle,
    });

    let downloadSuccess = false;
    let error = new UserError(
      ExtensionErrors.UserCancel,
      StringResources.vsc.webview.invalidFolder,
      ExtensionSource
    );
    if (folder !== undefined) {
      const sampleAppPath = path.join(folder[0].fsPath, msg.data.appFolder);
      if ((await fs.pathExists(sampleAppPath)) && (await fs.readdir(sampleAppPath)).length > 0) {
        error.name = ExtensionErrors.FolderAlreadyExist;
        error.message = StringResources.vsc.webview.folderExist;
        vscode.window.showErrorMessage(
          util.format(StringResources.vsc.webview.folderExistDialogTitle, sampleAppPath)
        );
      } else {
        const progress = VS_CODE_UI.createProgressBar(StringResources.vsc.webview.fetchData, 2);
        progress.start();
        try {
          progress.next(util.format(StringResources.vsc.webview.downloadFrom, msg.data.appUrl));
          const result = await this.fetchCodeZip(msg.data.appUrl);
          progress.next(StringResources.vsc.webview.unzipPackage);
          if (result !== undefined) {
            await this.saveFilesRecursively(
              new AdmZip(result.data),
              msg.data.appFolder,
              folder[0].fsPath
            );
            await this.downloadSampleHook(msg.data.appFolder, sampleAppPath);
            downloadSuccess = true;
            vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(sampleAppPath));
            await globalStateUpdate("openSampleReadme", true);
          } else {
            error = new SystemError(
              ExtensionErrors.FetchSampleError,
              StringResources.vsc.webview.emptyData,
              ExtensionSource
            );
            vscode.window.showErrorMessage(StringResources.vsc.webview.downloadSampleFail);
          }
        } catch (e) {
          error = returnSystemError(e, ExtensionSource, ExtensionErrors.UnknwonError);
        } finally {
          progress.end();
        }
      }
    }

    if (downloadSuccess) {
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.DownloadSample, {
        [TelemetryProperty.TriggerFrom]: TelemetryTiggerFrom.Webview,
        [TelemetryProperty.SampleAppName]: msg.data.appFolder,
        [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      });
    } else {
      ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.DownloadSample, error, {
        [TelemetryProperty.TriggerFrom]: TelemetryTiggerFrom.Webview,
        [TelemetryProperty.SampleAppName]: msg.data.appFolder,
        [TelemetryProperty.Success]: TelemetrySuccess.No,
      });
    }
  }

  private async updateGlobalStepsDone(data: any) {
    await globalStateUpdate("globalStepsDone", data);
  }

  private getGlobalStepsDone() {
    const globalStepsDone = globalStateGet("globalStepsDone", []);
    if (this.panel && this.panel.webview) {
      this.panel.webview.postMessage({
        message: "updateStepsDone",
        data: globalStepsDone,
      });
    }
  }

  private getWebpageTitle(panelType: PanelType) {
    switch (panelType) {
      case PanelType.QuickStart:
        return StringResources.vsc.webview.quickStartPageTitle;
      case PanelType.SampleGallery:
        return StringResources.vsc.webview.samplePageTitle;
    }
  }

  private setStatusChangeMap() {
    AppStudioTokenInstance.setStatusChangeMap(
      "quick-start-webview",
      (status, token, accountInfo) => {
        let email = undefined;
        if (status === "SignedIn") {
          email = (accountInfo as any).upn ? (accountInfo as any).upn : undefined;
        }

        if (this.panel && this.panel.webview) {
          this.panel.webview.postMessage({
            message: "m365AccountChange",
            data: email,
          });
        }

        return Promise.resolve();
      }
    );

    AzureAccountManager.setStatusChangeMap(
      "quick-start-webview",
      async (status, token, accountInfo) => {
        let email = undefined;
        if (status === "SignedIn") {
          const token = await AzureAccountManager.getAccountCredentialAsync();
          if (token !== undefined) {
            email = (token as any).username ? (token as any).username : undefined;
          }
        }

        if (this.panel && this.panel.webview) {
          this.panel.webview.postMessage({
            message: "azureAccountChange",
            data: email,
          });
        }

        return Promise.resolve();
      }
    );
  }

  private async fetchCodeZip(url: string) {
    let retries = 3;
    let result = undefined;
    while (retries > 0) {
      retries--;
      try {
        result = await axios.get(url, {
          responseType: "arraybuffer",
        });
        if (result.status === 200 || result.status === 201) {
          return result;
        }
      } catch (e) {
        await new Promise<void>((resolve: () => void): NodeJS.Timer => setTimeout(resolve, 10000));
      }
    }
    return result;
  }

  private async saveFilesRecursively(
    zip: AdmZip,
    appFolder: string,
    dstPath: string
  ): Promise<void> {
    await Promise.all(
      zip
        .getEntries()
        .filter((entry) => !entry.isDirectory && entry.entryName.includes(appFolder))
        .map(async (entry) => {
          const entryPath = entry.entryName.substring(entry.entryName.indexOf("/") + 1);
          const filePath = path.join(dstPath, entryPath);
          await fs.ensureDir(path.dirname(filePath));
          await fs.writeFile(filePath, entry.getData());
        })
    );
  }

  private async downloadSampleHook(sampleId: string, sampleAppPath: string) {
    // A temporary solution to avoid duplicate componentId
    if (sampleId === "todo-list-SPFx") {
      const originalId = "c314487b-f51c-474d-823e-a2c3ec82b1ff";
      const componentId = uuid.v4();
      glob.glob(`${sampleAppPath}/**/*.json`, { nodir: true, dot: true }, async (err, files) => {
        await Promise.all(
          files.map(async (file) => {
            let content = (await fs.readFile(file)).toString();
            const reg = new RegExp(originalId, "g");
            content = content.replace(reg, componentId);
            await fs.writeFile(file, content);
          })
        );
      });
    }
  }

  private getHtmlForWebview(panelType: PanelType) {
    const scriptBasePathOnDisk = vscode.Uri.file(path.join(ext.context.extensionPath, "out/"));
    const scriptBaseUri = scriptBasePathOnDisk.with({ scheme: "vscode-resource" });

    const scriptPathOnDisk = vscode.Uri.file(
      path.join(ext.context.extensionPath, "out/src", "client.js")
    );
    const scriptUri = scriptPathOnDisk.with({ scheme: "vscode-resource" });

    // Use a nonce to to only allow specific scripts to be run
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>ms-teams</title>
            <base href='${scriptBaseUri}' />
          </head>
          <body>
            <div id="root"></div>
            <script>
              const vscode = acquireVsCodeApi();
              const panelType = '${panelType}';
              const isSupportedNode = ${this.isValidNode()};
              const isMacPlatform = ${isMacOS()};
            </script>
            <script nonce="${nonce}"  type="module" src="${scriptUri}"></script>
          </body>
        </html>`;
  }

  private getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  isValidNode = () => {
    try {
      const supportedVersions = ["10", "12", "14"];
      const output = execSync("node --version");
      const regex = /v(?<major_version>\d+)\.(?<minor_version>\d+)\.(?<patch_version>\d+)/gm;

      const match = regex.exec(output.toString());
      if (!match) {
        return false;
      }

      const majorVersion = match.groups?.major_version;
      if (!majorVersion) {
        return false;
      }

      return supportedVersions.includes(majorVersion);
    } catch (e) {}
    return false;
  };

  public dispose() {
    WebviewPanel.currentPanels.splice(WebviewPanel.currentPanels.indexOf(this), 1);

    AppStudioTokenInstance.removeStatusChangeMap("quick-start-webview");

    AzureAccountManager.removeStatusChangeMap("quick-start-webview");

    // Clean up our resources
    this.panel.dispose();

    while (this.disposables.length) {
      const x = this.disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }
}
