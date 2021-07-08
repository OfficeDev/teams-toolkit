// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";

/**
 * CodelensProvider
 */
export class CryptoCodeLensProvider implements vscode.CodeLensProvider {
  private userDataRegex: RegExp;

  constructor() {
    this.userDataRegex = /fx-resource-[a-zA-Z\-]+\.[a-zA-Z\-_]+=(.*)/g;
  }

  public provideCodeLenses(
    document: vscode.TextDocument
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    if (document.fileName.endsWith("userdata")) {
      return this.computeCodeLenses(document, this.userDataRegex);
    } else {
      return [];
    }
  }

  private computeCodeLenses(
    document: vscode.TextDocument,
    secretRegex: RegExp
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();
    const regex = new RegExp(secretRegex);
    let matches;
    while ((matches = regex.exec(text)) !== null) {
      const line = document.lineAt(document.positionAt(matches.index).line);
      const indexOf = line.text.indexOf(matches[1]);
      const position = new vscode.Position(line.lineNumber, indexOf);
      const range = new vscode.Range(
        position,
        new vscode.Position(line.lineNumber, indexOf + matches[1].length)
      );
      const command = {
        title: "🔑Decrypt secret",
        command: "fx-extension.decryptSecret",
        arguments: [matches[1], range],
      };
      if (range) {
        codeLenses.push(new vscode.CodeLens(range, command));
      }
    }
    return codeLenses;
  }
}
