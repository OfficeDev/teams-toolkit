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

  public debug(message: string): void {
    this.addToDetailCache(LogLevel.Debug, message);
  }

  public info(message: string): void {
    this.addToDetailCache(LogLevel.Info, message);
    this.logger.info(message);
  }

  public warning(message: string): void {
    this.addToDetailCache(LogLevel.Warning, message);
    this.logger.warning(message);
  }

  public error(message: string): void {
    this.addToDetailCache(LogLevel.Error, message);
    this.logger.error(message);
  }

  public appendLine(message: string): void {
    commonlibLogger.outputChannel.appendLine(message);
  }

  public append(message: string): void {
    commonlibLogger.outputChannel.append(message);
  }

  public cleanup(): void {
    this.detailLogLines = [];
  }

  public printDetailLog(): void {
    this.logger.error(this.detailLogLines.join(os.EOL));
  }

  private addToDetailCache(level: LogLevel, message: string): void {
    const line = `${String(LogLevel[level])} ${new Date().toISOString()}: ${message}`;
    this.detailLogLines.push(line);
  }
}

export const vscodeLogger = new VSCodeLogger(commonlibLogger);
