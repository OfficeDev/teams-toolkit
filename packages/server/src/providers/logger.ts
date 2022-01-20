// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { MessageConnection } from "vscode-jsonrpc";

import { Colors, LogLevel, LogProvider } from "@microsoft/teamsfx-api";

import { Namespaces, NotificationTypes } from "../apis";

export default class ServerLogProvider implements LogProvider {
  private readonly connection: MessageConnection;

  constructor(connection: MessageConnection) {
    this.connection = connection;
  }

  async log(logLevel: LogLevel, message: string): Promise<boolean> {
    this.connection.sendNotification(NotificationTypes[Namespaces.Logger].show, logLevel, message);
    return true;
  }

  async trace(message: string): Promise<boolean> {
    return this.log(LogLevel.Trace, message);
  }

  async debug(message: string): Promise<boolean> {
    return this.log(LogLevel.Debug, message);
  }

  async info(message: string): Promise<boolean>;
  async info(message: { content: string; color: Colors }[]): Promise<boolean>;
  async info(message: any): Promise<boolean> {
    if (typeof message === "string") {
      return this.log(LogLevel.Info, message);
    }
    return this.log(
      LogLevel.Info,
      (message as Array<{ content: string; color: Colors }>).map((item) => item.content).join("")
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
}
