// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { LogLevel, LogProvider } from "@microsoft/teamsfx-api";
import os from "os";
import { DepsLogger } from "./depsLogger";

export class CoreDepsLoggerAdapter implements DepsLogger {
  private detailLogLines: string[] = [];
  private logProvider: LogProvider;

  public constructor(logProvider: LogProvider) {
    this.logProvider = logProvider;
  }

  public debug(message: string): void {
    this.addToDetailCache(LogLevel.Debug, message);
  }

  public info(message: string): void {
    this.addToDetailCache(LogLevel.Info, message);
    this.logProvider.info(message);
  }

  public warning(message: string): void {
    this.addToDetailCache(LogLevel.Warning, message);
    this.logProvider.warning(message);
  }

  public error(message: string): void {
    this.addToDetailCache(LogLevel.Error, message);
    this.logProvider.error(message);
  }

  public appendLine(message: string): void {
    this.logProvider.log(LogLevel.Info, message);
  }

  public append(message: string): void {
    this.logProvider.log(LogLevel.Info, message);
  }

  public cleanup(): void {
    this.detailLogLines = [];
  }

  public printDetailLog(): void {
    this.logProvider.error(this.detailLogLines.join(os.EOL));
  }

  private addToDetailCache(level: LogLevel, message: string): void {
    const line = `${String(LogLevel[level])} ${new Date().toISOString()}: ${message}`;
    this.detailLogLines.push(line);
  }
}
