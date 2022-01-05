import { commands, MessageItem, Uri, window, workspace, WorkspaceConfiguration } from "vscode";
import { getSkipNgrokConfig, hasTeamsfxBackend, hasTeamsfxBot } from "../commonUtils";

const configurationPrefix = "fx-extension";

export async function showWarningMessage(message: string, button: MessageItem): Promise<boolean> {
  const input = await window.showWarningMessage(message, { modal: true }, button);
  return input == button;
}

export async function openUrl(url: string): Promise<void> {
  await commands.executeCommand("vscode.open", Uri.parse(url));
}

export function isDotnetCheckerEnabled(): boolean {
  return checkerEnabled("validateDotnetSdk");
}

export function isFuncCoreToolsEnabled(): boolean {
  return checkerEnabled("validateFuncCoreTools");
}

export function isNodeCheckerEnabled(): boolean {
  return checkerEnabled("validateNode");
}

export async function hasFunction(): Promise<boolean> {
  return hasTeamsfxBackend();
}

export async function hasBot(): Promise<boolean> {
  return await hasTeamsfxBot();
}

export async function hasNgrok(): Promise<boolean> {
  return !(await getSkipNgrokConfig());
}

export function checkerEnabled(key: string): boolean {
  const configuration: WorkspaceConfiguration = workspace.getConfiguration(configurationPrefix);
  return configuration.get<boolean>(key, false);
}
