// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from "os";
import { IDepsLogger } from "./checker";
import { Logger } from "../logger";
import { LogLevel } from "@microsoft/teamsfx-api";

class FuncPluginLogger implements IDepsLogger {
  private detailLogLines: string[] = [];

  public debug(message: string): Promise<boolean> {
    this.appendLine(LogLevel.Debug, message);
    return Promise.resolve(true);
  }

  public info(message: string): Promise<boolean> {
    this.appendLine(LogLevel.Info, message);
    Logger.info(message);
    return Promise.resolve(true);
  }

  public warning(message: string): Promise<boolean> {
    this.appendLine(LogLevel.Warning, message);
    Logger.warning(message);
    return Promise.resolve(true);
  }

  public async error(message: string): Promise<boolean> {
    this.appendLine(LogLevel.Error, message);
    Logger.error(message);
    return Promise.resolve(true);
  }

  public async printDetailLog(): Promise<void> {
    Logger.error(this.detailLogLines.join(os.EOL));
  }

  public cleanup(): void {
    this.detailLogLines = [];
  }

  private appendLine(level: LogLevel, message: string): void {
    const line = `${LogLevel[level]} ${new Date().toISOString()}: ${message}`;
    this.detailLogLines.push(line);
  }
}

export const funcPluginLogger = new FuncPluginLogger();
