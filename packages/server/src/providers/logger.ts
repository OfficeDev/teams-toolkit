// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { MessageConnection } from "vscode-jsonrpc";
import * as os from "os";
import * as path from "path";
import * as fs from "fs-extra";

import { Colors, LogLevel, LogProvider } from "@microsoft/teamsfx-api";

import { Namespaces, NotificationTypes } from "../apis";

export default class ServerLogProvider implements LogProvider {
  private readonly connection: MessageConnection;
  private logFileName: string;
  private logFolderPath: string = path.join(os.tmpdir(), "VSTeamsToolkitExtension");

  constructor(connection: MessageConnection) {
    this.connection = connection;
    this.logFileName = `${new Date().toISOString().replace(/-|:|\.\d+Z$/g, "")}.log`;
  }

  async log(logLevel: LogLevel, message: string, logToFile?: boolean): Promise<boolean> {
    if (logToFile) {
      if (!(await fs.pathExists(this.logFolderPath))) {
        await fs.mkdir(this.logFolderPath);
      }
      await fs.appendFile(this.getLogFilePath(), message + "\n");
    } else {
      this.connection.sendNotification(
        NotificationTypes[Namespaces.Logger].show,
        logLevel,
        message
      );
    }
    return true;
  }

  async trace(message: string): Promise<boolean> {
    return this.log(LogLevel.Trace, message);
  }

  async debug(message: string): Promise<boolean> {
    return this.log(LogLevel.Debug, message);
  }

  async info(message: string, logToFile?: boolean): Promise<boolean>;
  async info(message: { content: string; color: Colors }[], logToFile?: boolean): Promise<boolean>;
  async info(message: any, logToFile?: boolean): Promise<boolean> {
    if (typeof message === "string") {
      return this.log(LogLevel.Info, message, logToFile);
    }
    return this.log(
      LogLevel.Info,
      (message as Array<{ content: string; color: Colors }>).map((item) => item.content).join(""),
      logToFile
    );
  }

  async warning(message: string): Promise<boolean> {
    return this.log(LogLevel.Warning, message);
  }

  async error(message: string): Promise<boolean> {
    return this.log(LogLevel.Error, message);
  }

  async fatal(message: string): Promise<boolean> {
    return this.log(LogLevel.Fatal, message);
  }

  getLogFilePath(): string {
    return path.join(this.logFolderPath, this.logFileName);
  }
}
