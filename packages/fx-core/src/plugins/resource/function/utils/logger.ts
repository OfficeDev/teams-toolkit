// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { LogProvider } from "@microsoft/teamsfx-api";

import { FunctionPluginInfo } from "../constants";

export class Logger {
  static logger: LogProvider | undefined;

  public static setLogger(_logger?: LogProvider) {
    this.logger = _logger;
  }

  public static debug(message: string) {
    this.logger?.debug(`[${FunctionPluginInfo.displayName}] ${message}`);
  }

  public static info(message: string) {
    this.logger?.info(`[${FunctionPluginInfo.displayName}] ${message}`);
  }

  public static warning(message: string) {
    this.logger?.warning(`[${FunctionPluginInfo.displayName}] ${message}`);
  }

  public static error(message: string) {
    this.logger?.error(`[${FunctionPluginInfo.displayName}] ${message}`);
  }
}
