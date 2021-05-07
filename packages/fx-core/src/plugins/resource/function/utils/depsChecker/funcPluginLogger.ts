// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IDepsLogger } from "./checker";
import { Logger } from "../logger";
import { ConfigFolderName, LogLevel } from "fx-api";
import * as path from "path";
import * as os from "os";
import * as fs from "fs-extra";

class FuncPluginLogger implements IDepsLogger {
  private static logFileName = "env-checker.log";
  private static globalConfigFolder = path.join(os.homedir(), `.${ConfigFolderName}`);
  private logFileCreated: boolean;

  constructor() {
    try {
      fs.mkdirSync(FuncPluginLogger.globalConfigFolder, { recursive: true });
      this.logFileCreated = true;
    } catch (error) {
      Logger.error(`Failed to create env checker log file, error = '${error}'`)
      this.logFileCreated = false;
    }
  }

  async debug(message: string): Promise<boolean> {
    await this.writeLog(LogLevel.Debug, message);
    return true;
  }

  async info(message: string): Promise<boolean> {
    await this.writeLog(LogLevel.Info, message);
    Logger.info(message);
    return true;
  }

  async warning(message: string): Promise<boolean> {
    await this.writeLog(LogLevel.Warning, message);
    Logger.warning(message);
    return true;
  }

  async error(message: string): Promise<boolean> {
    await this.writeLog(LogLevel.Error, message);
    Logger.error(message);
    return true;
  }

  private async writeLog(level: LogLevel, message: string): Promise<void> {
    if (!this.logFileCreated) {
      return;
    }

    const logFilePath = path.join(FuncPluginLogger.globalConfigFolder, FuncPluginLogger.logFileName);
    try {
      const line = `${LogLevel[level]} ${new Date().toISOString()}: ${message}` + os.EOL;
      await fs.appendFile(logFilePath, line);
    } catch (error) {
      Logger.debug(`Failed to write to log file '${logFilePath}', error = '${error}'`)
    }
  }
}

export const funcPluginLogger = new FuncPluginLogger();
