// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Colors, LogLevel, LogProvider } from "@microsoft/teamsfx-api";
import chalk from "chalk";
import { SuccessText, TextType, WarningText, colorize, replaceTemplateString } from "../colorize";
import ScreenManager from "../console/screen";
import { strings } from "../resource";
import { getColorizedString } from "../utils";

export class CLILogger implements LogProvider {
  logLevel: LogLevel = LogLevel.Info;

  getLogFilePath(): string {
    return "";
  }

  trace(message: string): Promise<boolean> {
    return this.log(LogLevel.Trace, message);
  }

  debug(message: string): Promise<boolean> {
    return this.log(LogLevel.Debug, message);
  }
  // verbose(message: string): Promise<boolean> {
  //   return this.log(LogLevel.Verbose, message);
  // }
  info(message: Array<{ content: string; color: Colors }>): Promise<boolean>;

  info(message: string): Promise<boolean>;

  info(message: string | Array<{ content: string; color: Colors }>): Promise<boolean> {
    if (message instanceof Array) {
      message = getColorizedString(message);
    } else {
      message = chalk.whiteBright(message);
    }
    return this.log(LogLevel.Info, message);
  }

  warning(message: string): Promise<boolean> {
    return this.log(LogLevel.Warning, message);
  }

  error(message: string): Promise<boolean> {
    return this.log(LogLevel.Error, message);
  }

  fatal(message: string): Promise<boolean> {
    return this.log(LogLevel.Fatal, message);
  }

  async log(logLevel: LogLevel, message: string): Promise<boolean> {
    if (logLevel < this.logLevel) {
      return true;
    }
    if (logLevel < LogLevel.Info) {
      ScreenManager.writeLine(colorize(message, TextType.Details));
    } else if (logLevel === LogLevel.Info) {
      ScreenManager.writeLine(colorize(message, TextType.Info));
    } else if (logLevel === LogLevel.Warning) {
      ScreenManager.writeLine(colorize(message, TextType.Warning));
    } else if (logLevel >= LogLevel.Error) {
      ScreenManager.writeLine(colorize(strings["error.prefix"] + message, TextType.Error), true);
    }
    return true;
  }

  outputSuccess(template: string, ...args: string[]): void {
    ScreenManager.writeLine(
      SuccessText + colorize(replaceTemplateString(template, ...args), TextType.Info)
    );
  }

  outputInfo(template: string, ...args: string[]): void {
    ScreenManager.writeLine(colorize(replaceTemplateString(template, ...args), TextType.Info));
  }

  outputDetails(template: string, ...args: string[]): void {
    ScreenManager.writeLine(colorize(replaceTemplateString(template, ...args), TextType.Details));
  }
  outputWarning(template: string, ...args: string[]): void {
    ScreenManager.writeLine(
      WarningText + colorize(replaceTemplateString(template, ...args), TextType.Warning),
      true
    );
  }
  outputError(template: string, ...args: string[]): void {
    ScreenManager.writeLine(
      colorize(strings["error.prefix"] + replaceTemplateString(template, ...args), TextType.Error),
      true
    );
  }
}

export const logger = new CLILogger();
