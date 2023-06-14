// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from "os";
import commonlibLogger, { VsCodeLogProvider } from "../../commonlib/log";
import { OutputChannel } from "vscode";
import { LogLevel } from "@microsoft/teamsfx-api";
import { DepsLogger } from "@microsoft/teamsfx-core";

export class VSCodeLogger implements DepsLogger {
  public outputChannel: OutputChannel;
  private logger: VsCodeLogProvider;
  private detailLogLines: string[] = [];

  public constructor(logger: VsCodeLogProvider) {
    this.outputChannel = logger.outputChannel;
    this.logger = logger;
  }

  public async debug(message: string): Promise<boolean> {
    this.addToDetailCache(LogLevel.Debug, message);
    return true;
  }

  public async info(message: string): Promise<boolean> {
    this.addToDetailCache(LogLevel.Info, message);
    return await this.logger.info(message);
  }

  public async warning(message: string): Promise<boolean> {
    this.addToDetailCache(LogLevel.Warning, message);
    return await this.logger.warning(message);
  }

  public async error(message: string): Promise<boolean> {
    this.addToDetailCache(LogLevel.Error, message);
    return await this.logger.error(message);
  }

  public appendLine(message: string): Promise<boolean> {
    commonlibLogger.outputChannel.appendLine(message);
    return Promise.resolve(true);
  }

  public async append(message: string): Promise<boolean> {
    commonlibLogger.outputChannel.append(message);
    return Promise.resolve(true);
  }

  public cleanup(): void {
    this.detailLogLines = [];
  }

  public async printDetailLog(): Promise<void> {
    await this.logger.error(this.detailLogLines.join(os.EOL));
  }

  private addToDetailCache(level: LogLevel, message: string): void {
    const line = `${LogLevel[level]} ${new Date().toISOString()}: ${message}`;
    this.detailLogLines.push(line);
  }
}

export const vscodeLogger = new VSCodeLogger(commonlibLogger);
