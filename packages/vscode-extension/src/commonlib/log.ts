// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { LogLevel, LogProvider, Colors } from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";

const outputChannelDisplayName = "Teams Toolkit";

export class VsCodeLogProvider implements LogProvider {
  outputChannel: vscode.OutputChannel;
  logFileName: string;

  private static instance: VsCodeLogProvider;

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel(outputChannelDisplayName);
    this.logFileName = `${new Date().toDateString}.log`;
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

  info(message: string, appendToFile?: boolean): Promise<boolean>;

  info(
    message: string | Array<{ content: string; color: Colors }>,
    appendToFile?: boolean
  ): Promise<boolean> {
    // VSCode output channel is not TTY, does not support ANSI color
    if (message instanceof Array) {
      message = message.map((x) => x.content).join("");
    }
    return this.log(LogLevel.Info, message, appendToFile);
  }

  warning(message: string, appendToFile?: boolean): Promise<boolean> {
    return this.log(LogLevel.Warning, message, appendToFile);
  }

  error(message: string, appendToFile?: boolean): Promise<boolean> {
    return this.log(LogLevel.Error, message, appendToFile);
  }

  fatal(message: string): Promise<boolean> {
    return this.log(LogLevel.Fatal, message);
  }

  /**
   * @Sample [2021-03-15T03:41:04.961Z] [Info] - [Extension] Initialize successfully.
   */
  async log(logLevel: LogLevel, message: string, appendToFile?: boolean): Promise<boolean> {
    try {
      if (logLevel < LogLevel.Info) return true;
      if (logLevel >= LogLevel.Warning) this.outputChannel.show();
      const dateString = new Date().toJSON();
      const formattedMessage = `[${dateString}] [${LogLevel[logLevel]}] - ${message}`;
      if (appendToFile) {
        const logFolderPath = vscode.workspace
          .getConfiguration("fx-extension.folderPath")
          .get("log") as string;
        if (logFolderPath && (await fs.pathExists(logFolderPath))) {
          const file = path.join(logFolderPath, this.logFileName);
          await fs.appendFile(file, formattedMessage);
        }
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
