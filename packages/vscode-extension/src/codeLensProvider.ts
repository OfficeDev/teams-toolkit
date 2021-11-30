// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as vscode from "vscode";
import { localSettingsJsonName } from "./debug/constants";
import * as StringResources from "./resources/Strings.json";
import * as fs from "fs-extra";
import { AdaptiveCardsFolderName } from "@microsoft/teamsfx-api";
import { TelemetryTiggerFrom } from "./telemetry/extTelemetryEvents";

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
  public static async detectedAdaptiveCards(): Promise<boolean> {
    const searchTerm = "adaptivecards.io/schemas/adaptive-card.json";
    const files: vscode.Uri[] = await vscode.workspace.findFiles(
      `**/${AdaptiveCardsFolderName}/*.json`
    );
    for (const file of files) {
      const content = await fs.readFile(file.fsPath, "utf8");
      if (content.includes(searchTerm)) {
        return true;
      }
    }
    return false;
  }
  provideCodeLenses(_document: vscode.TextDocument): vscode.ProviderResult<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];
    const topOfFile = new vscode.Range(0, 0, 0, 0);
    const command = {
      title: `👀${StringResources.vsc.commandsTreeViewProvider.previewAdaptiveCard}`,
      command: "fx-extension.OpenAdaptiveCardExt",
      arguments: [TelemetryTiggerFrom.CodeLens],
    };
    codeLenses.push(new vscode.CodeLens(topOfFile, command));
    return codeLenses;
  }
}

export class ManifestTemplateCodeLensProvider implements vscode.CodeLensProvider {
  private schemaRegex = /\$schema/;
  private manifestConfigDataRegex = /{{config.manifest[\.a-zA-Z]+}}/g;
  private manifestStateDataRegex = /{{state\.[a-zA-Z-_]+\.\w+}}/g;

  public provideCodeLenses(
    document: vscode.TextDocument
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    if (document.fileName.endsWith("template.json")) {
      return this.computeTemplateCodeLenses(document);
    } else {
      return this.computePreviewCodeLenses(document);
    }
  }

  private computeTemplateCodeLenses(document: vscode.TextDocument) {
    const codeLenses: vscode.CodeLens[] = [];
    const command = {
      title: "📝Preview",
      command: "fx-extension.openPreviewFile",
      arguments: [{ fsPath: document.fileName }],
    };
    codeLenses.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), command));

    const text = document.getText();
    const regex = new RegExp(this.schemaRegex);
    const matches = regex.exec(text);
    if (matches != null) {
      const match = matches[0];
      const line = document.lineAt(document.positionAt(matches.index).line);
      const indexOf = line.text.indexOf(match);
      const position = new vscode.Position(line.lineNumber, indexOf);
      const range = new vscode.Range(
        position,
        new vscode.Position(line.lineNumber, indexOf + match.length)
      );
      const url = line.text.substring(line.text.indexOf("https"), line.text.length - 2);
      const schemaCommand = {
        title: "Open schema",
        command: "fx-extension.openSchema",
        arguments: [{ url: url }],
      };
      codeLenses.push(new vscode.CodeLens(range, schemaCommand));
    }

    if (document.fileName.endsWith("manifest.remote.template.json")) {
      const configCodelenses = this.calculateCodeLens(document, this.manifestConfigDataRegex, {
        title: "🖊️Edit the config file",
        command: "fx-extension.openConfigState",
        arguments: [{ type: "config" }],
      });
      codeLenses.push(...configCodelenses);

      const stateCodelenses = this.calculateCodeLens(document, this.manifestStateDataRegex, {
        title: "👁️View the state file",
        command: "fx-extension.openConfigState",
        arguments: [{ type: "state" }],
      });
      codeLenses.push(...stateCodelenses);
    }

    return codeLenses;
  }

  private calculateCodeLens(document: vscode.TextDocument, regex: RegExp, command: vscode.Command) {
    let matches;
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();
    while ((matches = regex.exec(text)) !== null) {
      const line = document.lineAt(document.positionAt(matches.index).line);
      const indexOf = line.text.indexOf(matches[0]);
      const position = new vscode.Position(line.lineNumber, indexOf);
      const range = document.getWordRangeAtPosition(position, new RegExp(regex));

      if (range) {
        codeLenses.push(new vscode.CodeLens(range, command));
      }
    }
    return codeLenses;
  }

  private computePreviewCodeLenses(document: vscode.TextDocument) {
    const codeLenses: vscode.CodeLens[] = [];
    const command = {
      title: "Update to Teams platform",
      command: "fx-extension.updatePreviewFile",
      arguments: [{ fsPath: document.fileName }, TelemetryTiggerFrom.CodeLens],
    };
    codeLenses.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), command));
    return codeLenses;
  }
}
