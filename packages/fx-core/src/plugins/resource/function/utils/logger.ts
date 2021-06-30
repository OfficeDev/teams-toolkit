// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { LogProvider } from "@microsoft/teamsfx-api";

import { normalizeMessage } from "../resources/message";

export class Logger {
  static logger: LogProvider | undefined;

  public static setLogger(_logger?: LogProvider): void {
    this.logger = _logger;
  }

  public static debug(message: string): void {
    this.logger?.debug(normalizeMessage(message));
  }

  public static info(message: string): void {
    this.logger?.info(normalizeMessage(message));
  }

  public static warning(message: string): void {
    this.logger?.warning(normalizeMessage(message));
  }

  public static error(message: string): void {
    this.logger?.error(normalizeMessage(message));
  }
}
