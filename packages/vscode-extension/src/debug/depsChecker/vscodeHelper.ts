import { commands, MessageItem, Uri, window, workspace, WorkspaceConfiguration } from "vscode";
import { getSkipNgrokConfig, hasTeamsfxBackend, hasTeamsfxBot } from "../commonUtils";

const configurationPrefix = "fx-extension";

class VSCodeHelper {
  public async showWarningMessage(message: string, button: MessageItem): Promise<boolean> {
    const input = await window.showWarningMessage(message, { modal: true }, button);
    return input == button;
  }

  public async openUrl(url: string): Promise<void> {
    await commands.executeCommand("vscode.open", Uri.parse(url));
  }

  public isDotnetCheckerEnabled(): boolean {
    return this.checkerEnabled("validateDotnetSdk");
  }

  public isFuncCoreToolsEnabled(): boolean {
    return this.checkerEnabled("validateFuncCoreTools");
  }

  public isNodeCheckerEnabled(): boolean {
    return this.checkerEnabled("validateNode");
  }

  public async hasFunction(): Promise<boolean> {
    return hasTeamsfxBackend();
  }

  public async hasBot(): Promise<boolean> {
    return await hasTeamsfxBot();
  }

  public async hasNgrok(): Promise<boolean> {
    return !(await getSkipNgrokConfig());
  }

  public checkerEnabled(key: string): boolean {
    const configuration: WorkspaceConfiguration = workspace.getConfiguration(configurationPrefix);
    const res = configuration.get<boolean>(key, false);
    return res;
  }
}

export const vscodeHelper = new VSCodeHelper();
