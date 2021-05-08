// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from "os";
import commonlibLogger, { VsCodeLogProvider } from "../../commonlib/log";
import { OutputChannel } from "vscode";
import { LogLevel, ConfigFolderName } from "fx-api";
import { IDepsLogger } from "./checker";

export class VSCodeLogger implements IDepsLogger {
  public outputChannel: OutputChannel;
  private logger: VsCodeLogProvider;
  private cachedLogLines: string[] = [];

  public constructor(logger: VsCodeLogProvider) {
    this.outputChannel = logger.outputChannel;
    this.logger = logger;
  }

  public async debug(message: string): Promise<boolean> {
    await this.writeCachedLog(LogLevel.Debug, message);
    return true;
  }

  public async info(message: string): Promise<boolean> {
    return await this.logger.info(message);
  }

  public async warning(message: string): Promise<boolean> {
    return await this.logger.warning(message);
  }

  public async error(message: string): Promise<boolean> {
    return await this.logger.error(message);
  }

  public async printCachedMessagesAsError(): Promise<void> {
      await this.logger.error(this.cachedLogLines.join(os.EOL));
  }

  public async cleanupCache(): Promise<void> {
      this.cachedLogLines = [];
  }

  private async writeCachedLog(level: LogLevel, message: string): Promise<void> {
    const line = `${LogLevel[level]} ${new Date().toISOString()}: ${message}`;
    this.cachedLogLines.push(line);
  }
}

export const vscodeLogger = new VSCodeLogger(commonlibLogger);
