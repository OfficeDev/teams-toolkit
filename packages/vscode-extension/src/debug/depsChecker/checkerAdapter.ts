// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import * as util from "util";
import commonlibLogger, { VsCodeLogProvider } from "../../commonlib/log";
import { window, workspace, WorkspaceConfiguration, MessageItem, OutputChannel } from "vscode";
import { LogLevel, ConfigFolderName } from "fx-api";
import { Messages, openUrl } from "./common";
const appendFile = util.promisify(fs.appendFile);
const mkdir = util.promisify(fs.mkdir);

export { cpUtils } from "../cpUtils";
export { hasTeamsfxBackend } from "../commonUtils";
export { ExtTelemetry } from "../../telemetry/extTelemetry";
export { TelemetryProperty } from "../../telemetry/extTelemetryEvents";

export class CheckerLogger {
  private static checkerLogFileName = "env-checker.log";
  private static loggerFilePath = path.join(os.homedir(), `.${ConfigFolderName}`, CheckerLogger.checkerLogFileName);

  public outputChannel: OutputChannel;
  private logger: VsCodeLogProvider;

  public constructor(logger: VsCodeLogProvider) {
    this.outputChannel = logger.outputChannel;
    this.logger = logger;
  }

  async trace(message: string): Promise<boolean> {
    await this.writeLog(LogLevel.Fatal, message);
    return true;
  }

  async debug(message: string): Promise<boolean> {
    await this.writeLog(LogLevel.Fatal, message);
    return true;
  }

  async info(message: string): Promise<boolean> {
    await this.writeLog(LogLevel.Fatal, message);
    return await this.logger.info(message);
  }

  async warning(message: string): Promise<boolean> {
    await this.writeLog(LogLevel.Fatal, message);
    return await this.logger.warning(message);
  }

  async error(message: string): Promise<boolean> {
    await this.writeLog(LogLevel.Fatal, message);
    return await this.logger.error(message);
  }

  async fatal(message: string): Promise<boolean> {
    await this.writeLog(LogLevel.Fatal, message);
    return await this.logger.fatal(message);
  }

  private async writeLog(level: LogLevel, message: string): Promise<void> {
    const line = `${level} ${new Date().toISOString()}: ${message}` + path.sep;

    // make sure dir exists before append the file
    await mkdir(path.basename(CheckerLogger.loggerFilePath));
    await appendFile(CheckerLogger.loggerFilePath, line);
  }
}

export const logger = new CheckerLogger(commonlibLogger);

// uncomment this line if the extension implements log level
// export const logger = commonlibLogger;

const downloadIndicatorInterval = 1000; // same as vscode-dotnet-runtime
const configurationPrefix = "fx-extension";
const validateDotnetSdkKey = "validateDotnetSdk";
const validateFuncCoreToolsKey = "validateFuncCoreTools";
const validateNodeVersionKey = "validateNode";

export function dotnetCheckerEnabled(): boolean {
  return checkerEnabled(validateDotnetSdkKey);
}

export function funcToolCheckerEnabled(): boolean {
  return checkerEnabled(validateFuncCoreToolsKey);
}

export function nodeCheckerEnabled(): boolean {
  return checkerEnabled(validateNodeVersionKey);
}

export async function runWithProgressIndicator(callback: () => Promise<void>): Promise<void> {
  const timer = setInterval(() => logger.outputChannel.append("."), downloadIndicatorInterval);
  try {
    await callback();
  } finally {
    logger.outputChannel.appendLine("");
    clearTimeout(timer);
  }
}

export async function displayContinueWithLearnMore(
  message: string,
  link: string
): Promise<boolean> {
  const learnMoreButton: MessageItem = { title: Messages.learnMoreButtonText };
  const continueButton: MessageItem = { title: Messages.continueButtonText };
  const input = await window.showWarningMessage(
    message,
    { modal: true },
    learnMoreButton,
    continueButton
  );

  if (input === continueButton) {
    return true;
  } else if (input == learnMoreButton) {
    await openUrl(link);
  }

  return false;
}

export async function displayLearnMore(message: string, link: string): Promise<boolean> {
  return await displayWarningMessage(message, Messages.learnMoreButtonText, async () => {
    await openUrl(link);
    return Promise.resolve(false);
  });
}

export async function displayWarningMessage(
  message: string,
  buttonText: string,
  action: () => Promise<boolean>
): Promise<boolean> {
  const button: MessageItem = { title: buttonText };
  const input = await window.showWarningMessage(message, { modal: true }, button);
  if (input === button) {
    return await action();
  }

  // click cancel button
  return false;
}

export function showOutputChannel(): void {
  logger.outputChannel.show(false);
}

export function getResourceDir(): string {
  return path.resolve(__dirname, "resource");
}

function checkerEnabled(key: string): boolean {
  const configuration: WorkspaceConfiguration = workspace.getConfiguration(configurationPrefix);
  return configuration.get<boolean>(key, false);
}
