// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import chalk from "chalk";
import figures from "figures";
import { LogLevel, LogProvider, Colors } from "@microsoft/teamsfx-api";

import { CLILogLevel } from "../constants";
import { getColorizedString } from "../utils";
import ScreenManager from "../console/screen";

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

  info(message: Array<{ content: string; color: Colors }>): Promise<boolean>;

  info(message: string): Promise<boolean>;

  info(message: string | Array<{ content: string; color: Colors }>): Promise<boolean> {
    if (message instanceof Array) {
      message = getColorizedString(message);
    } else {
      message = chalk.whiteBright(message);
    }
    return this.log(LogLevel.Info, message);
  }

  white(msg: string): string {
    return chalk.whiteBright(msg);
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

  linkColor(msg: string): string {
    return chalk.cyanBright.underline(msg);
  }

  async log(logLevel: LogLevel, message: string): Promise<boolean> {
    switch (logLevel) {
      case LogLevel.Trace:
        if (CLILogProvider.logLevel === CLILogLevel.debug) {
          ScreenManager.writeLine(chalk.whiteBright(message), true);
        }
        break;
      case LogLevel.Debug:
        if (CLILogProvider.logLevel === CLILogLevel.debug) {
          ScreenManager.writeLine(chalk.whiteBright(message));
        }
        break;
      case LogLevel.Info:
        if (
          CLILogProvider.logLevel === CLILogLevel.debug ||
          CLILogProvider.logLevel === CLILogLevel.verbose
        ) {
          ScreenManager.writeLine(message);
        }
        break;
      case LogLevel.Warning:
        if (CLILogProvider.logLevel !== CLILogLevel.error) {
          ScreenManager.writeLine(chalk.yellowBright(message), true);
        }
        break;
      case LogLevel.Error:
      case LogLevel.Fatal:
        ScreenManager.writeLine(chalk.redBright(`(${figures.cross}) ${message}`), true);
        break;
    }
    return true;
  }

  necessaryLog(logLevel: LogLevel, message: string, white = false) {
    switch (logLevel) {
      case LogLevel.Trace:
      case LogLevel.Debug:
      case LogLevel.Info:
        if (white) {
          ScreenManager.writeLine(chalk.whiteBright(message));
        } else {
          ScreenManager.writeLine(chalk.greenBright(message));
        }
        break;
      case LogLevel.Warning:
        ScreenManager.writeLine(chalk.yellowBright(message), true);
        break;
      case LogLevel.Error:
      case LogLevel.Fatal:
        ScreenManager.writeLine(chalk.redBright(`(${figures.cross}) ${message}`), true);
        break;
    }
  }

  rawLog(message: string) {
    process.stdout.write(message);
  }
}

export default CLILogProvider.getInstance();
