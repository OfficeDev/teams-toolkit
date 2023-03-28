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

  async trace(message: string): Promise<boolean> {
    // return this.log(LogLevel.Trace, message);
    return true;
  }

  async debug(message: string): Promise<boolean> {
    // return this.log(LogLevel.Debug, message);
    return true;
  }

  info(message: Array<{ content: string; color: Colors }>, logToFile?: boolean): Promise<boolean>;

  info(message: string, logToFile?: boolean): Promise<boolean>;

  info(
    message: string | Array<{ content: string; color: Colors }>,
    logToFile?: boolean
  ): Promise<boolean> {
    // VSCode output channel is not TTY, does not support ANSI color
    if (message instanceof Array) {
      message = message.map((x) => x.content).join("");
    }
    return this.log(LogLevel.Info, message, logToFile);
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
  async log(logLevel: LogLevel, message: string, logToFile?: boolean): Promise<boolean> {
    try {
      if (logLevel < LogLevel.Info) return true;
      if (logLevel >= LogLevel.Warning) this.outputChannel.show();
      const dateString = new Date().toJSON();
      const formattedMessage = `[${dateString}] [${LogLevel[logLevel]}] - ${message}`;
      if (logToFile) {
        await fs.appendFile(this.getLogFilePath(), formattedMessage);
      } else {
        this.outputChannel.appendLine(formattedMessage);
      }
      return true;
    } catch (e) {
      return false;
    }
  }
}

export default VsCodeLogProvider.getInstance();
