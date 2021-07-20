// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { LogProvider } from "@microsoft/teamsfx-api";
import { FunctionPluginInfo } from "../constants";

function normalizeLogs(message: string): string {
  return `[${FunctionPluginInfo.displayName}] ${message}`;
}

export class Logger {
  static logger: LogProvider | undefined;

  public static setLogger(_logger?: LogProvider): void {
    this.logger = _logger;
  }

  public static debug(message: string): void {
    this.logger?.debug(normalizeLogs(message));
  }

  public static info(message: string): void {
    this.logger?.info(normalizeLogs(message));
  }

  public static warning(message: string): void {
    this.logger?.warning(normalizeLogs(message));
  }

  public static error(message: string): void {
    this.logger?.error(normalizeLogs(message));
  }
}
