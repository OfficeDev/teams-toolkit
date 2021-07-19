// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from "os";
import cliLogger from "../../../commonlib/log";
import { LogLevel } from "@microsoft/teamsfx-api";
import { IDepsLogger } from "./checker";

export class CLILogger implements IDepsLogger {
  private detailLogLines: string[] = [];

  public constructor() {}

  public async debug(message: string): Promise<boolean> {
    this.appendLine(LogLevel.Debug, message);
    return true;
  }

  public async info(message: string): Promise<boolean> {
    cliLogger.necessaryLog(LogLevel.Info, message);
    return true;
  }

  public async warning(message: string): Promise<boolean> {
    this.appendLine(LogLevel.Warning, message);
    return await cliLogger.warning(message);
  }

  public async error(message: string): Promise<boolean> {
    this.appendLine(LogLevel.Error, message);
    return await cliLogger.error(message);
  }

  public async printDetailLog(): Promise<void> {
    await cliLogger.error(this.detailLogLines.join(os.EOL));
  }

  public cleanup(): void {
    this.detailLogLines = [];
  }

  private appendLine(level: LogLevel, message: string): void {
    const line = `${LogLevel[level]} ${new Date().toISOString()}: ${message}`;
    this.detailLogLines.push(line);
  }
}

export const cliEnvCheckerLogger = new CLILogger();
