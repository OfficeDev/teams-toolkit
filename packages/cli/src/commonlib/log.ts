// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import colors from "colors";

import { LogLevel, LogProvider } from "@microsoft/teamsfx-api";

import { CLILogLevel } from "../constants";

export class CLILogProvider implements LogProvider {
  private static instance: CLILogProvider;

  private static logLevel: CLILogLevel = CLILogLevel.error;

  public getLogLevel() {
    return CLILogProvider.logLevel;
  }

  public setLogLevel(logLevel: CLILogLevel) {
    CLILogProvider.logLevel = logLevel;
  }

  /**
   * Gets instance
   * @returns instance
   */
  public static getInstance(): CLILogProvider {
    if (!CLILogProvider.instance) {
      CLILogProvider.instance = new CLILogProvider();
    }

    return CLILogProvider.instance;
  }

  trace(message: string): Promise<boolean> {
    return this.log(LogLevel.Trace, message);
  }

  debug(message: string): Promise<boolean> {
    return this.log(LogLevel.Debug, message);
  }

  info(message: string): Promise<boolean> {
    return this.log(LogLevel.Info, message);
  }

  warning(message: string): Promise<boolean> {
    return this.log(LogLevel.Warning, message);
  }

  error(message: string): Promise<boolean> {
    return this.log(LogLevel.Error, message);
  }

  fatal(message: string): Promise<boolean> {
    return this.log(LogLevel.Fatal, message);
  }

  async log(logLevel: LogLevel, message: string): Promise<boolean> {
    switch (logLevel) {
      case LogLevel.Trace:
        if (CLILogProvider.logLevel === CLILogLevel.debug) {
          console.trace(colors.white(message));
        }
        break;
      case LogLevel.Debug:
        if (CLILogProvider.logLevel === CLILogLevel.debug) {
          console.debug(colors.white(message.white));
        }
        break;
      case LogLevel.Info:
        if (
          CLILogProvider.logLevel === CLILogLevel.debug ||
          CLILogProvider.logLevel === CLILogLevel.verbose
        ) {
          console.info(colors.green(message));
        }
        break;
      case LogLevel.Warning:
        if (CLILogProvider.logLevel !== CLILogLevel.error) {
          console.warn(colors.yellow(message));
        }
        break;
      case LogLevel.Error:
      case LogLevel.Fatal:
        console.error(colors.red(message));
        break;
    }
    return true;
  }

  async necessaryLog(logLevel: LogLevel, message: string) {
    switch (logLevel) {
      case LogLevel.Trace:
      case LogLevel.Debug:
      case LogLevel.Info:
        console.info(colors.green(message));
        break;
      case LogLevel.Warning:
        console.warn(colors.yellow(message));
        break;
      case LogLevel.Error:
      case LogLevel.Fatal:
        console.error(colors.red(message));
        break;
    }
  }
}

export default CLILogProvider.getInstance();
