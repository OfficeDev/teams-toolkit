import * as vscode from "vscode";
import { registerChatAgent } from "./chat/agent";
import { ext } from "./extensionVariables";

export function activate(context: vscode.ExtensionContext) {
  ext.context = context;
  registerChatAgent();
}

export function deactivate() { }
