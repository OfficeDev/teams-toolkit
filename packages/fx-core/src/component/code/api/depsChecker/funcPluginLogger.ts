// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from "os";
import { LogLevel, LogProvider } from "@microsoft/teamsfx-api";
import { DepsLogger } from "../../../../common/deps-checker/depsLogger";

export class FuncPluginLogger implements DepsLogger {
  private logger: LogProvider;
  constructor(logger: LogProvider) {
    this.logger = logger;
  }
  private detailLogLines: string[] = [];
  public debug(message: string): Promise<boolean> {
    this.addToCache(LogLevel.Debug, message);
    return Promise.resolve(true);
  }

  public info(message: string): Promise<boolean> {
    this.addToCache(LogLevel.Info, message);
    this.logger.info(message);
    return Promise.resolve(true);
  }

  public warning(message: string): Promise<boolean> {
    this.addToCache(LogLevel.Warning, message);
    this.logger.warning(message);
    return Promise.resolve(true);
  }

  public async error(message: string): Promise<boolean> {
    this.addToCache(LogLevel.Error, message);
    this.logger.error(message);
    return true;
  }

  public async printDetailLog(): Promise<void> {
    this.logger.error(this.detailLogLines.join(os.EOL));
  }

  public cleanup(): void {
    this.detailLogLines = [];
  }

  private addToCache(level: LogLevel, message: string): void {
    const line = `${LogLevel[level]} ${new Date().toISOString()}: ${message}`;
    this.detailLogLines.push(line);
  }

  public async append(message: string): Promise<boolean> {
    return true;
  }

  public async appendLine(message: string): Promise<boolean> {
    this.logger.info(message);
    return true;
  }
}
