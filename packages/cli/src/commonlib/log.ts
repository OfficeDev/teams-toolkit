// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import colors from "colors";

import { LogLevel, LogProvider } from "@microsoft/teamsfx-api";

import { CLILogLevel } from "../constants";

colors.white.green.yellow.red;

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

  white(msg: string): string {
    if (process.stdout.isTTY) {
      return msg.white;
    }
    return msg;
  }

  green(msg: string): string {
    if (process.stdout.isTTY) {
      return msg.green;
    }
    return msg;
  }

  yellow(msg: string): string {
    if (process.stderr.isTTY) {
      return msg.yellow;
    }
    return msg;
  }

  red(msg: string): string {
    if (process.stderr.isTTY) {
      return msg.red;
    }
    return msg;
  }

  linkColor(msg: string): string {
    if (process.stdout.isTTY) {
      return msg.cyan.underline;
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
          console.info(this.white(message));
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
