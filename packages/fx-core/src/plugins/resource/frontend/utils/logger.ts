// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { LogProvider } from "@microsoft/teamsfx-api";

export class Logger {
  static logger: LogProvider | undefined;
  private static component?: string;

  public static setLogger(_logger?: LogProvider, component?: string): void {
    this.logger = _logger;
    this.component = component;
  }

  private static format(message: string): string {
    return this.component ? `[${this.component}] ${message}` : message;
  }

  public static debug(message: string): void {
    this.logger?.debug(this.format(message));
  }

  public static info(message: string): void {
    this.logger?.info(this.format(message));
  }

  public static warning(message: string): void {
    this.logger?.warning(this.format(message));
  }

  public static error(message: string): void {
    this.logger?.error(this.format(message));
  }
}
