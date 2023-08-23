// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Colors, LogLevel, LogProvider } from "@microsoft/teamsfx-api";
import chalk from "chalk";
import {
  ErrorPrefix,
  SuccessText,
  TextType,
  WarningText,
  colorize,
  replaceTemplateString,
} from "../colorize";
import ScreenManager from "../console/screen";
import { getColorizedString } from "../utils";

export class CLILogger implements LogProvider {
  logLevel: LogLevel = LogLevel.Info;

  getLogFilePath(): string {
    return "";
  }

  verbose(message: string): void {
    this.log(LogLevel.Verbose, message);
  }

  debug(message: string): void {
    this.log(LogLevel.Debug, message);
  }

  info(message: Array<{ content: string; color: Colors }>): void;

  info(message: string): void;

  info(message: string | Array<{ content: string; color: Colors }>): void {
    if (message instanceof Array) {
      message = getColorizedString(message);
    } else {
      message = chalk.whiteBright(message);
    }
    this.log(LogLevel.Info, message);
  }

  warning(message: string): void {
    this.log(LogLevel.Warning, message);
  }

  error(message: string): void {
    return this.log(LogLevel.Error, message);
  }

  log(logLevel: LogLevel, message: string): void {
    if (logLevel < this.logLevel) {
      return;
    }
    if (logLevel < LogLevel.Info) {
      ScreenManager.writeLine(colorize(message, TextType.Details));
    } else if (logLevel === LogLevel.Info) {
      ScreenManager.writeLine(colorize(message, TextType.Info));
    } else if (logLevel === LogLevel.Warning) {
      ScreenManager.writeLine(colorize(message, TextType.Warning));
    } else if (logLevel >= LogLevel.Error) {
      ScreenManager.writeLine(colorize(ErrorPrefix + message, TextType.Error), true);
    }
  }

  async logInFile(logLevel: LogLevel, message: string): Promise<void> {
    return new Promise((resolve) => resolve());
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
      colorize(ErrorPrefix + replaceTemplateString(template, ...args), TextType.Error),
      true
    );
  }
}

export const logger = new CLILogger();
