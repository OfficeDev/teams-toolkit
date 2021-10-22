// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import glob = require("glob");
import * as vscode from "vscode";
import { localSettingsJsonName } from "./debug/constants";
import * as StringResources from "./resources/Strings.json";
import * as fs from "fs";
import { getWorkspacePath } from "./handlers";
import path = require("path");

/**
 * CodelensProvider
 */
export class CryptoCodeLensProvider implements vscode.CodeLensProvider {
  private userDataRegex: RegExp;
  private localDebugRegex: RegExp;

  constructor() {
    this.userDataRegex =
      /fx-resource-[a-zA-Z\-]+\.[a-zA-Z\-_]+(?:Secret|Password|VariableParams)=(.*)/g;
    this.localDebugRegex =
      /(?: *|\t*)"(?:clientSecret|SimpleAuthEnvironmentVariableParams|botPassword)": "(crypto_.*)"/g;
  }

  public provideCodeLenses(
    document: vscode.TextDocument
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    if (document.fileName.endsWith("userdata")) {
      return this.computeCodeLenses(document, this.userDataRegex);
    } else if (document.fileName.endsWith(localSettingsJsonName)) {
      return this.computeCodeLenses(document, this.localDebugRegex);
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
      const match = matches[1];
      const line = document.lineAt(document.positionAt(matches.index).line);
      const indexOf = line.text.indexOf(match);
      const position = new vscode.Position(line.lineNumber, indexOf);
      const range = new vscode.Range(
        position,
        new vscode.Position(line.lineNumber, indexOf + match.length)
      );
      const command = {
        title: "🔑Decrypt secret",
        command: "fx-extension.decryptSecret",
        arguments: [match, range],
      };
      if (range) {
        codeLenses.push(new vscode.CodeLens(range, command));
      }
    }
    return codeLenses;
  }
}

export class AdaptiveCardCodeLensProvider implements vscode.CodeLensProvider {
  public static async getAdaptiveCardFiles(): Promise<string[]> {
    console.log("ACSTUDIO - Searching for Cards");
    const adaptiveCardFiles: string[] = [];
    const folder = getWorkspacePath();
    if (!folder) return [];
    const files = await glob.sync(path.join(folder, "/**/*.json"), {});
    files.forEach((file) => {
      const searchTerm = "adaptivecards.io/schemas/adaptive-card.json";
      const content = fs.readFileSync(file, "utf8");
      if (content.includes(searchTerm)) {
        adaptiveCardFiles.push(file);
      }
    });
    return adaptiveCardFiles;
  }
  provideCodeLenses(_document: vscode.TextDocument): vscode.ProviderResult<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];
    const topOfFile = new vscode.Range(0, 0, 0, 0);
    const command = {
      title: `👀${StringResources.vsc.commandsTreeViewProvider.previewAdaptiveCard}`,
      command: "fx-extension.OpenAdaptiveCardExt",
    };
    codeLenses.push(new vscode.CodeLens(topOfFile, command));
    return codeLenses;
  }
}
