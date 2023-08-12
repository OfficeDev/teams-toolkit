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

  log(logLevel: LogLevel, message: string, logToFile?: boolean): void {
    if (logToFile) {
      if (!fs.pathExistsSync(this.logFolderPath)) {
        fs.mkdirSync(this.logFolderPath);
      }
      fs.appendFileSync(this.getLogFilePath(), message + "\n");
    } else {
      this.connection.sendNotification(
        NotificationTypes[Namespaces.Logger].show,
        logLevel,
        message
      );
    }
  }

  verbose(message: string): void {
    this.log(LogLevel.Verbose, message);
  }

  debug(message: string): void {
    this.log(LogLevel.Debug, message);
  }

  info(message: string, logToFile?: boolean): void;
  info(message: { content: string; color: Colors }[], logToFile?: boolean): void;
  info(message: any, logToFile?: boolean): void {
    if (typeof message === "string") {
      this.log(LogLevel.Info, message, logToFile);
    } else {
      this.log(
        LogLevel.Info,
        (message as Array<{ content: string; color: Colors }>).map((item) => item.content).join(""),
        logToFile
      );
    }
  }

  warning(message: string): void {
    this.log(LogLevel.Warning, message);
  }

  error(message: string): void {
    this.log(LogLevel.Error, message);
  }

  getLogFilePath(): string {
    return path.join(this.logFolderPath, this.logFileName);
  }
}
