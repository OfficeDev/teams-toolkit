// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as vscode from "vscode";
import { environmentNameManager, envUtil } from "@microsoft/teamsfx-core";
import { environmentVariableRegex } from "./constants";
import { getSystemInputs } from "./utils/systemEnvUtils";
import { DotenvParseOutput } from "dotenv";

export class MyCompletionItemProvider implements vscode.CompletionItemProvider {
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.CompletionItem[] {
    const res: vscode.CompletionItem[] = [];
    const item: vscode.CompletionItem = new vscode.CompletionItem(
      "ENV_NAME",
      vscode.CompletionItemKind.Variable
    );
    res.push(item);
    return res;
  }
}
