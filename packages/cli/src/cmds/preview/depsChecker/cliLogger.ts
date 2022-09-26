// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from "os";
import cliLogger from "../../../commonlib/log";
import { DepsLogger } from "@microsoft/teamsfx-core/build/common/deps-checker";
import { LogLevel } from "@microsoft/teamsfx-api";

export class CLILogger implements DepsLogger {
  private detailLogLines: string[] = [];

  public constructor() {}
  public async debug(message: string): Promise<boolean> {
    this.addToCache(LogLevel.Debug, message);
    return true;
  }

  public async info(message: string): Promise<boolean> {
    cliLogger.necessaryLog(LogLevel.Info, message);
    return true;
  }

  public async warning(message: string): Promise<boolean> {
    this.addToCache(LogLevel.Warning, message);
    return await cliLogger.warning(message);
  }

  public async error(message: string): Promise<boolean> {
    this.addToCache(LogLevel.Error, message);
    return await cliLogger.error(message);
  }

  public async append(message: string): Promise<boolean> {
    cliLogger.rawLog(message);
    return Promise.resolve(true);
  }
  public async appendLine(message: string): Promise<boolean> {
    cliLogger.rawLog(`${message}${os.EOL}`);
    return Promise.resolve(true);
  }

  public async printDetailLog(): Promise<void> {
    await cliLogger.error(this.detailLogLines.join(os.EOL));
  }

  public cleanup(): void {
    this.detailLogLines = [];
  }

  private addToCache(level: LogLevel, message: string): void {
    const line = `${LogLevel[level]} ${new Date().toISOString()}: ${message}`;
    this.detailLogLines.push(line);
  }
}

export const cliEnvCheckerLogger = new CLILogger();
