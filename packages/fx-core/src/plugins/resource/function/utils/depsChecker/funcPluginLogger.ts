// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from "os";
import { Logger } from "../logger";
import { LogLevel } from "@microsoft/teamsfx-api";
import { DepsLogger } from "../../../../../common/deps-checker/depsLogger";

class FuncPluginLogger implements DepsLogger {
  private detailLogLines: string[] = [];
  public debug(message: string): Promise<boolean> {
    this.addToCache(LogLevel.Debug, message);
    return Promise.resolve(true);
  }

  public info(message: string): Promise<boolean> {
    this.addToCache(LogLevel.Info, message);
    Logger.info(message);
    return Promise.resolve(true);
  }

  public warning(message: string): Promise<boolean> {
    this.addToCache(LogLevel.Warning, message);
    Logger.warning(message);
    return Promise.resolve(true);
  }

  public async error(message: string): Promise<boolean> {
    this.addToCache(LogLevel.Error, message);
    Logger.error(message);
    return Promise.resolve(true);
  }

  public async printDetailLog(): Promise<void> {
    Logger.error(this.detailLogLines.join(os.EOL));
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
    Logger.info(message);
    return true;
  }
}

export const funcDepsLogger = new FuncPluginLogger();
