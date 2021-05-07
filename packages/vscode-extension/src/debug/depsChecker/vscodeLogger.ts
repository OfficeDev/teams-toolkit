// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import * as fs from "fs-extra";
import * as os from "os";
import commonlibLogger, { VsCodeLogProvider } from "../../commonlib/log";
import { OutputChannel } from "vscode";
import { LogLevel, ConfigFolderName } from "fx-api";
import { IDepsLogger } from "./checker";

export class VSCodeLogger implements IDepsLogger {
  private static checkerLogFileName = "env-checker.log";
  private static globalConfigFolder = path.join(os.homedir(), `.${ConfigFolderName}`);

  public outputChannel: OutputChannel;
  private logger: VsCodeLogProvider;
  private logFileCreated: boolean;

  public constructor(logger: VsCodeLogProvider) {
    this.outputChannel = logger.outputChannel;
    this.logger = logger;

    try {
      fs.mkdirSync(VSCodeLogger.globalConfigFolder, { recursive: true });
      this.logFileCreated = true;
    } catch (error) {
      this.logger.error(`Failed to create env checker log file, error = '${error}'`)
      this.logFileCreated = false;
    }
  }

  async debug(message: string): Promise<boolean> {
    await this.writeLog(LogLevel.Debug, message);
    return true;
  }

  async info(message: string): Promise<boolean> {
    await this.writeLog(LogLevel.Info, message);
    return await this.logger.info(message);
  }

  async warning(message: string): Promise<boolean> {
    await this.writeLog(LogLevel.Warning, message);
    return await this.logger.warning(message);
  }

  async error(message: string): Promise<boolean> {
    await this.writeLog(LogLevel.Error, message);
    return await this.logger.error(message);
  }

  private async writeLog(level: LogLevel, message: string): Promise<void> {
    if (!this.logFileCreated) {
      return;
    }

    const logFilePath = path.join(VSCodeLogger.globalConfigFolder, VSCodeLogger.checkerLogFileName);
    try {
      const line = `${LogLevel[level]} ${new Date().toISOString()}: ${message}` + os.EOL;
      await fs.appendFile(logFilePath, line);
    } catch (error) {
      this.logger.debug(`Failed to write to log file '${logFilePath}', error = '${error}'`)
    }
  }
}

export const vscodeLogger = new VSCodeLogger(commonlibLogger);
