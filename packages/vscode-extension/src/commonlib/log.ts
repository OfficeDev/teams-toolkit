// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { LogLevel, LogProvider, Colors } from "@microsoft/teamsfx-api";
import * as vscode from "vscode";

const outputChannelDisplayName = "Teams Toolkit";

export class VsCodeLogProvider implements LogProvider {
  outputChannel: vscode.OutputChannel;

  private static instance: VsCodeLogProvider;

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel(
      outputChannelDisplayName,
      // Align with languages:id in package.json for colorized output.
      "teamsfx-toolkit-output"
    );
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

  async trace(message: string): Promise<boolean> {
    // return this.log(LogLevel.Trace, message);
    return true;
  }

  async debug(message: string): Promise<boolean> {
    // return this.log(LogLevel.Debug, message);
    return true;
  }

  info(message: Array<{ content: string; color: Colors }>): Promise<boolean>;

  info(message: string): Promise<boolean>;

  info(message: string | Array<{ content: string; color: Colors }>): Promise<boolean> {
    // VSCode output channel is not TTY, does not support ANSI color
    if (message instanceof Array) {
      message = message.map((x) => x.content).join("");
    }
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
      if (logLevel < LogLevel.Info) return true;
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
