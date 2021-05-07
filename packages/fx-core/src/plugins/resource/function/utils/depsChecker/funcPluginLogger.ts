// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IDepsLogger } from "./checker";
import { Logger } from "../logger";
import { ConfigFolderName, LogLevel } from "fx-api";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import * as util from "util";

const appendFile = util.promisify(fs.appendFile);

class FuncPluginLogger implements IDepsLogger {
  private static logFileName = "env-checker.log";
  private static globalConfigFolder = path.join(os.homedir(), `.${ConfigFolderName}`);

  constructor() {
    fs.mkdirSync(FuncPluginLogger.globalConfigFolder, { recursive: true });
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
    const line = `${LogLevel[level]} ${new Date().toISOString()}: ${message}` + os.EOL;
    const logFilePath = path.join(FuncPluginLogger.globalConfigFolder, FuncPluginLogger.logFileName);
    await appendFile(logFilePath, line);
  }
}

export const funcPluginLogger = new FuncPluginLogger();
