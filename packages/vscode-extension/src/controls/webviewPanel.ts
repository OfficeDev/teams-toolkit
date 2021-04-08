// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import * as vscode from "vscode";
import { ext } from "../extensionVariables";
import { Commands } from "./Commands";

export class WebviewPanel {
  private static readonly viewType = "react";
  public static currentPanel: WebviewPanel | undefined;

  private panel: vscode.WebviewPanel;
  private readonly extensionPath: string;
  private disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionPath: string) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;
    if (WebviewPanel.currentPanel) {
      WebviewPanel.currentPanel.panel.reveal(column);
    } else {
      WebviewPanel.currentPanel = new WebviewPanel(extensionPath, column || vscode.ViewColumn.One);
    }
  }

  private constructor(extensionPath: string, column: vscode.ViewColumn) {
    this.extensionPath = extensionPath;

    // Create and show a new webview panel
    this.panel = vscode.window.createWebviewPanel(
      WebviewPanel.viewType,
      "Teams Toolkit v2",
      column,
      {
        // Enable javascript in the webview
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.file(path.join(this.extensionPath, "out"))]
      }
    );

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programatically
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(
      (msg) => {
        switch (msg.command) {
          case Commands.OpenExternalLink:
            vscode.env.openExternal(vscode.Uri.parse(msg.data));
            break;
          default:
            break;
        }
      },
      undefined,
      ext.context.subscriptions
    );

    // Set the webview's initial html content
    this.panel.webview.html = this.getHtmlForWebview();
  }

  private getHtmlForWebview() {
    const scriptBasePathOnDisk = vscode.Uri.file(path.join(this.extensionPath, "out/"));
    const scriptBaseUri = scriptBasePathOnDisk.with({ scheme: "vscode-resource" });

    const scriptPathOnDisk = vscode.Uri.file(path.join(this.extensionPath, "out", "client.js"));
    const scriptUri = scriptPathOnDisk.with({ scheme: "vscode-resource" });

    // Use a nonce to whitelist which scripts can be run
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
              window.onload = function() {
                console.log('Ready to accept data.');
              };
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

  public static sendMessage(message: string, data?: any) {
    if (
      WebviewPanel.currentPanel &&
      WebviewPanel.currentPanel.panel &&
      WebviewPanel.currentPanel.panel.webview
    ) {
      WebviewPanel.currentPanel.panel.webview.postMessage({
        message: message,
        data: data
      });
    }
  }

  public dispose() {
    WebviewPanel.currentPanel = undefined;

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
