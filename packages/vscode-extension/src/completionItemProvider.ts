// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";

export class ManifestTemplateCompletionItemProvider implements vscode.CompletionItemProvider {
  private botSnippet = `"bots": [
    {
        "botId": "",
        "scopes": [
            "personal",
            "team",
            "groupchat"
        ],
        "commandLists": []
    }
],`;

  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.ProviderResult<vscode.CompletionItem[]> {
    const botItem = new vscode.CompletionItem(`"bots"`, vscode.CompletionItemKind.Field);
    botItem.insertText = this.botSnippet;
    return [botItem];
  }
}
