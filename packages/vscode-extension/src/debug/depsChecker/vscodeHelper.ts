// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { commands, MessageItem, Uri, window, workspace, WorkspaceConfiguration } from "vscode";
import { hasTeamsfxBackend, hasTeamsfxBot } from "../commonUtils";
import { vscodeTelemetry } from "./vscodeTelemetry";
import { DepsCheckerEvent } from "@microsoft/teamsfx-core";
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
    return this.checkerEnabled("prerequisiteCheck.dotnetSdk");
  }

  public isFuncCoreToolsEnabled(): boolean {
    const isFuncCoreToolsEnabled = this.checkerEnabled("prerequisiteCheck.funcCoreTools");
    if (!isFuncCoreToolsEnabled) {
      vscodeTelemetry.sendEvent(DepsCheckerEvent.funcCheckSkipped);
    }
    return isFuncCoreToolsEnabled;
  }

  public isNodeCheckerEnabled(): boolean {
    const isNodeCheckerEnabled = this.checkerEnabled("prerequisiteCheck.node");
    if (!isNodeCheckerEnabled) {
      vscodeTelemetry.sendEvent(DepsCheckerEvent.nodeCheckSkipped);
    }
    return isNodeCheckerEnabled;
  }

  public isNgrokCheckerEnabled(): boolean {
    return this.checkerEnabled("prerequisiteCheck.ngrok");
  }

  public isTrustDevCertEnabled(): boolean {
    return this.checkerEnabled("prerequisiteCheck.devCert");
  }

  public async hasFunction(): Promise<boolean> {
    return hasTeamsfxBackend();
  }

  public async hasBot(): Promise<boolean> {
    return await hasTeamsfxBot();
  }

  public checkerEnabled(key: string): boolean {
    const configuration: WorkspaceConfiguration = workspace.getConfiguration(configurationPrefix);
    const res = configuration.get<boolean>(key, false);
    return res;
  }
}

export const vscodeHelper = new VSCodeHelper();
