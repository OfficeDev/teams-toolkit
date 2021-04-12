// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import commonlibLogger from "../../commonlib/log";
import { window, workspace, WorkspaceConfiguration, OutputChannel, MessageItem, debug } from "vscode";
import { openUrl } from "./common";

export { cpUtils } from "../cpUtils";
export { hasTeamsfxBackend } from "../commonUtils";
export const logger = commonlibLogger;

const downloadIndicatorInterval = 1000; // same as vscode-dotnet-runtime
const configurationPrefix = "fx-extension";
const validateDotnetSdkKey = "validateDotnetSdk";
const validateFuncCoreToolsKey = "validateFuncCoreTools";

export function dotnetCheckerEnabled(): boolean {
  return checkerEnabled(validateDotnetSdkKey);
}

export function funcToolCheckerEnabled(): boolean {
  return checkerEnabled(validateFuncCoreToolsKey);
}

export async function runWithProgressIndicator(
  callback: () => Promise<void>
): Promise<void> {
  const timer = setInterval(() => logger.outputChannel.append("."), downloadIndicatorInterval);
  try {
    await callback();
  } finally {
    logger.outputChannel.appendLine("");
    clearTimeout(timer);
  }
}

export async function displayLearnMore(message: string, link: string): Promise<boolean> {
  return await displayWarningMessage(message, "Learn more", () => {
    openUrl(link);
    return Promise.resolve(true);
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

export function showOutputChannel() {
  logger.outputChannel.show(false);
}

function checkerEnabled(key: string): boolean {
  const configuration: WorkspaceConfiguration = workspace.getConfiguration(configurationPrefix);
  return configuration.get<boolean>(key, false);
}
