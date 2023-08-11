// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { LogLevel, LogProvider, Colors } from "@microsoft/teamsfx-api";
import * as vscode from "vscode";
import * as fs from "fs-extra";
import { defaultExtensionLogPath } from "../globalVariables";

const outputChannelDisplayName = "Teams Toolkit";

export class VsCodeLogProvider implements LogProvider {
  outputChannel: vscode.OutputChannel;
  logFileName: string;

  private static instance: VsCodeLogProvider;

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel(
      outputChannelDisplayName,
      // Align with languages:id in package.json for colorized output.
      "teamsfx-toolkit-output"
    );
    // E.g. "Wed Oct 05 2011 22:48:00 GMT+0800 (China Standard Time)"
    // > "20230328T070957.log"
    this.logFileName = `${new Date().toISOString().replace(/-|:|\.\d+Z$/g, "")}.log`;
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

  /**
   * Get log file path
   */
  getLogFilePath(): string {
    return `${defaultExtensionLogPath}/${this.logFileName}`;
  }

  verbose(message: string): void {
    // return this.log(LogLevel.Trace, message);
  }

  debug(message: string): void {
    // return this.log(LogLevel.Debug, message);
  }

  info(message: Array<{ content: string; color: Colors }>, logToFile?: boolean): void;

  info(message: string, logToFile?: boolean): void;

  info(message: string | Array<{ content: string; color: Colors }>, logToFile?: boolean): void {
    // VSCode output channel is not TTY, does not support ANSI color
    if (message instanceof Array) {
      message = message.map((x) => x.content).join("");
    }
    this.log(LogLevel.Info, message, logToFile);
  }

  warning(message: string): void {
    return this.log(LogLevel.Warning, message);
  }

  error(message: string): void {
    return this.log(LogLevel.Error, message);
  }

  /**
   * @Sample [2021-03-15T03:41:04.961Z] [Info] - [Extension] Initialize successfully.
   */
  log(logLevel: LogLevel, message: string, logToFile?: boolean): void {
    try {
      if (logLevel < LogLevel.Info) return;
      if (logLevel >= LogLevel.Warning) this.outputChannel.show();
      const dateString = new Date().toJSON();
      const formattedMessage = `[${dateString}] [${LogLevel[logLevel]}] - ${message}`;
      if (logToFile) {
        fs.appendFileSync(this.getLogFilePath(), formattedMessage + "\n");
      } else {
        this.outputChannel.appendLine(formattedMessage);
      }
    } catch (e) {}
  }
}

export default VsCodeLogProvider.getInstance();
