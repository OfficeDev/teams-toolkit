import * as vscode from "vscode";
import * as path from "path";
import { Commands } from "../../controls/Commands";
import * as globalVariables from "../../globalVariables";
import { TreeContainerType } from "./treeContainerType";

export class CommandsWebviewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private containerType: TreeContainerType = TreeContainerType.Development;

  constructor(type: TreeContainerType) {
    this.containerType = type;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.command) {
        case Commands.ExecuteCommand:
          await vscode.commands.executeCommand(msg.id, "TreeView");
          break;
        case Commands.OpenExternalLink:
          vscode.env.openExternal(vscode.Uri.parse(msg.data));
      }
    });
  }

  public onLockChanged(locked: boolean) {
    this._view?.webview.postMessage({
      message: "lockChanged",
      data: locked,
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptBasePathOnDisk = vscode.Uri.file(
      path.join(globalVariables.context.extensionPath, "out/")
    );
    const scriptBaseUri = scriptBasePathOnDisk.with({ scheme: "vscode-resource" });
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptPathOnDisk = vscode.Uri.file(
      path.join(globalVariables.context.extensionPath, "out/src", "tree.js")
    );
    const scriptUri = scriptPathOnDisk.with({ scheme: "vscode-resource" });
    // // Do the same for the stylesheet.
    // const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
    // const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
    // const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));
    const codiconsUri = webview.asWebviewUri(
      vscode.Uri.file(
        path.join(globalVariables.context.extensionPath, "out", "resource", "codicon.css")
      )
    );
    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return `<!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <base href='${scriptBaseUri}' />
            <meta http-equiv="Content-Security-Policy" content="font-src ${webview.cspSource};">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>ms-teams</title>
            <link href="${codiconsUri}" rel="stylesheet" />
          </head>
          <body style="padding: 0 0">
            <div id="root"></div>
            <script>
              const vscode = acquireVsCodeApi();
              const containerType = '${this.containerType}';
            </script>
            <script nonce="${nonce}"  type="module" src="${scriptUri}"></script>
          </body>
        </html>`;
  }
}

function getNonce() {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
