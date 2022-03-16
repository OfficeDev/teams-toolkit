// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { LogProvider } from "@microsoft/teamsfx-api";

const PLUGIN_NAME_IN_LOG = "CICD Plugin";

export class Logger {
  static logger: LogProvider | undefined;

  public static setLogger(_logger?: LogProvider): void {
    this.logger = _logger;
  }

  public static debug(message: string): void {
    this.logger?.debug(`[${PLUGIN_NAME_IN_LOG}] ${message}`);
  }

  public static info(message: string): void {
    this.logger?.info(`[${PLUGIN_NAME_IN_LOG}] ${message}`);
  }

  public static warning(message: string): void {
    this.logger?.warning(`[${PLUGIN_NAME_IN_LOG}] ${message}`);
  }

  public static error(message: string): void {
    this.logger?.error(`[${PLUGIN_NAME_IN_LOG}] ${message}`);
  }
}
