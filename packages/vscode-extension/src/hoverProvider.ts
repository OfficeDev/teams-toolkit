// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";

const maxSmallIntegerV8 = 2 ** 30;

export class ManifestTemplateHoverProvider implements vscode.HoverProvider {
  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    const message = new vscode.MarkdownString(`Local: xxx \n\n Dev: xxx`);
    const range = new vscode.Range(position.line, 0, position.line, maxSmallIntegerV8);
    const testHover = new vscode.Hover(message, range);
    return testHover;
  }
}
