// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { LogLevel, LogProvider } from "fx-api";
import * as vscode from "vscode";

const outputChannelDisplayName = "Teams Toolkit";

export class VsCodeLogProvider implements LogProvider {
  outputChannel: vscode.OutputChannel;

  private static instance: VsCodeLogProvider;

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel(outputChannelDisplayName);
  }

  /**
   * Gets instance
   * @returns instance
   */
  public static getInstance(): VsCodeLogProvider {
    if (!VsCodeLogProvider.instance) {
      VsCodeLogProvider.instance = new VsCodeLogProvider();
    }

    return VsCodeLogProvider.instance;
  }

  trace(message: string): Promise<boolean> {
    return this.log(LogLevel.Trace, message);
  }

  debug(message: string): Promise<boolean> {
    return this.log(LogLevel.Debug, message);
  }

  info(message: string): Promise<boolean> {
    return this.log(LogLevel.Info, message);
  }

  warning(message: string): Promise<boolean> {
    return this.log(LogLevel.Warning, message);
  }

  error(message: string): Promise<boolean> {
    return this.log(LogLevel.Error, message);
  }

  fatal(message: string): Promise<boolean> {
    return this.log(LogLevel.Fatal, message);
  }

  /**
   * @Sample [2021-03-15T03:41:04.961Z] [Info] - [Extension] Initialize successfully.
   */
  async log(logLevel: LogLevel, message: string): Promise<boolean> {
    try {
      if (logLevel >= LogLevel.Warning) this.outputChannel.show();
      const dateString = new Date().toJSON();
      this.outputChannel.appendLine(`[${dateString}] [${LogLevel[logLevel]}] - ${message}`);
      return true;
    } catch (e) {
      return false;
    }
  }
}

export default VsCodeLogProvider.getInstance();
