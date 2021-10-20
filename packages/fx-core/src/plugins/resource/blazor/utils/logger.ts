// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { LogProvider } from "@microsoft/teamsfx-api";

import { BlazorPluginInfo } from "../constants";

export class Logger {
  static logger: LogProvider | undefined;

  public static setLogger(_logger?: LogProvider): void {
    this.logger = _logger;
  }

  public static debug(message: string): void {
    this.logger?.debug(`[${BlazorPluginInfo.DisplayName}] ${message}`);
  }

  public static info(message: string): void {
    this.logger?.info(`[${BlazorPluginInfo.DisplayName}] ${message}`);
  }

  public static warning(message: string): void {
    this.logger?.warning(`[${BlazorPluginInfo.DisplayName}] ${message}`);
  }

  public static error(message: string): void {
    this.logger?.error(`[${BlazorPluginInfo.DisplayName}] ${message}`);
  }
}
