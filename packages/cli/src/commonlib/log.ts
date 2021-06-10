// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { LogLevel, LogProvider, Colors } from "@microsoft/teamsfx-api";

import { CLILogLevel } from "../constants";
import { getColorizedString } from "./../utils";
import chalk from "chalk";


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

  info(message: Array<{content: string, color: Colors}>): Promise<boolean>;
  
  info(message: string): Promise<boolean>;

  info(message: string | Array<{content: string, color: Colors}>): Promise<boolean> {
    if (message instanceof Array) {
      message = getColorizedString(message);
    } else {
      message = this.white(message);
    }
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

  white(msg: string): string {
    if (process.stdout.isTTY) {
      return chalk.whiteBright(msg);
    }
    return msg;
  }

  green(msg: string): string {
    if (process.stdout.isTTY) {
      return chalk.greenBright(msg);
    }
    return msg;
  }

  yellow(msg: string): string {
    if (process.stderr.isTTY) {
      return chalk.yellowBright(msg);
    }
    return msg;
  }

  red(msg: string): string {
    if (process.stderr.isTTY) {
      return chalk.redBright(msg);
    }
    return msg;
  }

  linkColor(msg: string): string {
    if (process.stdout.isTTY) {
      return chalk.cyanBright.underline(msg);
    }
    return msg;
  }

  async log(logLevel: LogLevel, message: string): Promise<boolean> {
    switch (logLevel) {
      case LogLevel.Trace:
        if (CLILogProvider.logLevel === CLILogLevel.debug) {
          console.trace(this.white(message));
        }
        break;
      case LogLevel.Debug:
        if (CLILogProvider.logLevel === CLILogLevel.debug) {
          console.debug(this.white(message));
        }
        break;
      case LogLevel.Info:
        if (
          CLILogProvider.logLevel === CLILogLevel.debug ||
          CLILogProvider.logLevel === CLILogLevel.verbose
        ) {
          console.info(message);
        }
        break;
      case LogLevel.Warning:
        if (CLILogProvider.logLevel !== CLILogLevel.error) {
          console.warn(this.yellow(message));
        }
        break;
      case LogLevel.Error:
      case LogLevel.Fatal:
        console.error(this.red(message));
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
          console.info(this.white(message));
        } else {
          console.info(this.green(message));
        }
        break;
      case LogLevel.Warning:
        console.warn(this.yellow(message));
        break;
      case LogLevel.Error:
      case LogLevel.Fatal:
        console.error(this.red(message));
        break;
    }
  }
}

export default CLILogProvider.getInstance();
