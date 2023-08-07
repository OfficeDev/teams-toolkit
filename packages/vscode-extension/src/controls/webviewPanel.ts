// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import * as uuid from "uuid";
import * as vscode from "vscode";

import { Inputs } from "@microsoft/teamsfx-api";
import { AppStudioScopes, Correlator, sampleProvider } from "@microsoft/teamsfx-core";

import AzureAccountManager from "../commonlib/azureLogin";
import M365TokenInstance from "../commonlib/m365Login";
import { TreatmentVariableValue } from "../exp/treatmentVariables";
import * as globalVariables from "../globalVariables";
import { downloadSample, getSystemInputs, openFolder } from "../handlers";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import {
  AccountType,
  InProductGuideInteraction,
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
  TelemetryTriggerFrom,
} from "../telemetry/extTelemetryEvents";
import { localize } from "../utils/localizeUtils";
import { Commands } from "./Commands";
import { PanelType } from "./PanelType";

export class WebviewPanel {
  private static readonly viewType = "react";
  public static currentPanels: WebviewPanel[] = [];

  private panel: vscode.WebviewPanel;
  private panelType: PanelType = PanelType.SampleGallery;
  private disposables: vscode.Disposable[] = [];

  public static createOrShow(panelType: PanelType, isToSide?: boolean) {
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
      isToSide
        ? WebviewPanel.currentPanels.push(
            new WebviewPanel(panelType, column || vscode.ViewColumn.Two)
          )
        : WebviewPanel.currentPanels.push(
            new WebviewPanel(panelType, column || vscode.ViewColumn.One)
          );
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
        localResourceRoots: [
          vscode.Uri.file(path.join(globalVariables.context.extensionPath, "out")),
        ],
      }
    );

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programatically
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.onDidChangeViewState(
      (e) => {
        const panel = e.webviewPanel;
        if (
          TreatmentVariableValue.inProductDoc &&
          (panelType === PanelType.RespondToCardActions ||
            panelType === PanelType.FunctionBasedNotificationBotReadme ||
            panelType === PanelType.RestifyServerNotificationBotReadme)
        ) {
          ExtTelemetry.sendTelemetryEvent(TelemetryEvent.InteractWithInProductDoc, {
            [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.InProductDoc,
            [TelemetryProperty.Interaction]: panel.visible
              ? InProductGuideInteraction.Show
              : InProductGuideInteraction.Hide,
            [TelemetryProperty.Identifier]: panelType,
          });
        } else if (panelType === PanelType.AccountHelp) {
          ExtTelemetry.sendTelemetryEvent(TelemetryEvent.InteractWithInProductDoc, {
            [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.AccountHelp,
            [TelemetryProperty.Interaction]: panel.visible
              ? InProductGuideInteraction.Show
              : InProductGuideInteraction.Hide,
            [TelemetryProperty.Identifier]: panelType,
          });
        }
      },
      null,
      globalVariables.context.subscriptions
    );

    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(
      async (msg) => {
        switch (msg.command) {
          case Commands.OpenExternalLink:
            void vscode.env.openExternal(vscode.Uri.parse(msg.data));
            break;
          case Commands.CloneSampleApp:
            await Correlator.run(async () => {
              await this.downloadSampleApp(msg);
            });
            break;
          case Commands.DisplayCommands:
            await vscode.commands.executeCommand("workbench.action.quickOpen", `>${msg.data}`);
            break;
          case Commands.CreateNewProject:
            await vscode.commands.executeCommand(
              "fx-extension.create",
              TelemetryTriggerFrom.Webview
            );
            break;
          case Commands.SwitchPanel:
            WebviewPanel.createOrShow(msg.data);
            break;
          case Commands.SendTelemetryEvent:
            ExtTelemetry.sendTelemetryEvent(msg.data.eventName, msg.data.properties);
          case Commands.LoadSampleCollection:
            await this.LoadSampleCollection();
            break;
          default:
            break;
        }
      },
      undefined,
      globalVariables.context.subscriptions
    );

    // Set the webview's initial html content
    this.panel.webview.html = this.getHtmlForWebview(panelType);
    this.panel.iconPath = this.getWebviewPanelIconPath(panelType);
  }

  private async downloadSampleApp(msg: any) {
    const props: any = {
      [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.Webview,
      [TelemetryProperty.SampleAppName]: msg.data.appFolder,
    };
    ExtTelemetry.sendTelemetryEvent(TelemetryEvent.DownloadSampleStart, props);
    const inputs: Inputs = getSystemInputs();
    inputs["samples"] = msg.data.appFolder;
    inputs.projectId = inputs.projectId ?? uuid.v4();

    const res = await downloadSample(inputs);
    if (inputs.projectId) {
      props[TelemetryProperty.NewProjectId] = inputs.projectId;
    }
    if (res.isOk()) {
      props[TelemetryProperty.Success] = TelemetrySuccess.Yes;
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.DownloadSample, props);
      await openFolder(res.value, true);
    } else {
      props[TelemetryProperty.Success] = TelemetrySuccess.No;
      ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.DownloadSample, res.error, props);
    }
  }

  private async LoadSampleCollection() {
    await sampleProvider.fetchSampleConfig();
    if (this.panel && this.panel.webview) {
      await this.panel.webview.postMessage({
        message: Commands.LoadSampleCollection,
        data: sampleProvider.SampleCollection,
      });
    }
  }

  private getWebpageTitle(panelType: PanelType): string {
    switch (panelType) {
      case PanelType.SampleGallery:
        return localize("teamstoolkit.webview.samplePageTitle");
      case PanelType.Survey:
        return localize("teamstoolkit.webview.surveyPageTitle");
      case PanelType.RespondToCardActions:
        return localize("teamstoolkit.guides.cardActionResponse.label");
      case PanelType.AccountHelp:
        return localize("teamstoolkit.webview.accountHelp");
      case PanelType.RestifyServerNotificationBotReadme:
        return localize("teamstoolkit.guides.notificationBot.label");
      case PanelType.FunctionBasedNotificationBotReadme:
        return localize("teamstoolkit.guides.notificationBot.label");
    }
  }

  private getHtmlForWebview(panelType: PanelType) {
    const scriptBasePathOnDisk = vscode.Uri.file(
      path.join(globalVariables.context.extensionPath, "out/")
    );
    const scriptBaseUri = this.panel.webview.asWebviewUri(scriptBasePathOnDisk);

    const scriptPathOnDisk = vscode.Uri.file(
      path.join(globalVariables.context.extensionPath, "out/src", "client.js")
    );
    const scriptUri = this.panel.webview.asWebviewUri(scriptPathOnDisk);

    // Use a nonce to to only allow specific scripts to be run
    const nonce = this.getNonce();
    return `<!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>ms-teams</title>
            <base href='${scriptBaseUri.toString()}' />
          </head>
          <body>
            <div id="root"></div>
            <script>
              const vscode = acquireVsCodeApi();
              const panelType = '${panelType}';
            </script>
            <script nonce="${nonce}"  type="module" src="${scriptUri.toString()}"></script>
          </body>
        </html>`;
  }

  private getNonce() {
    let text = "";
    // eslint-disable-next-line
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  private getWebviewPanelIconPath(panelType: PanelType) {
    if (panelType === PanelType.AccountHelp) {
      return vscode.Uri.file(
        path.join(globalVariables.context.extensionPath, "media/itp/m365icon.svg")
      );
    }
    return undefined;
  }

  public dispose() {
    const panelIndex = WebviewPanel.currentPanels.indexOf(this);
    if (TreatmentVariableValue.inProductDoc && this.panelType === PanelType.RespondToCardActions) {
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.InteractWithInProductDoc, {
        [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.InProductDoc,
        [TelemetryProperty.Interaction]: InProductGuideInteraction.Close,
        [TelemetryProperty.Identifier]: this.panelType,
      });
    } else if (this.panelType === PanelType.AccountHelp) {
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.InteractWithInProductDoc, {
        [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.AccountHelp,
        [TelemetryProperty.Interaction]: InProductGuideInteraction.Close,
        [TelemetryProperty.Identifier]: this.panelType,
      });
    }

    WebviewPanel.currentPanels.splice(panelIndex, 1);

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
