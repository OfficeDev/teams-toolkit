// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { LogLevel, LogProvider } from "fx-api";
import * as winston from "winston";

export class MockLogger implements LogProvider {
  private static instance: MockLogger;
  private logger: winston.Logger;

  private constructor() {
    this.logger = winston.createLogger({
      level: "info",
      format: winston.format.json(),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: "combined.log" }),
      ],
    });
  }

  public static getInstance(): MockLogger {
    if (!MockLogger.instance) {
      MockLogger.instance = new MockLogger();
    }

    return MockLogger.instance;
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
      case LogLevel.Fatal: {
        this.logger.emerg(message);
      }
      case LogLevel.Error: {
        this.logger.error(message);
      }
      case LogLevel.Warning: {
        this.logger.warn(message);
      }
      case LogLevel.Info: {
        this.logger.info(message);
      }
      case LogLevel.Debug: {
        this.logger.debug(message);
      }
      case LogLevel.Trace: {
        this.logger.silly(message);
      }
    }
    return true;
  }
}
