// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import commonlibLogger from "../../commonlib/log";
import { workspace, WorkspaceConfiguration, OutputChannel } from "vscode";
import { configurationPrefix } from "../constants";

export { cpUtils } from "../cpUtils";
export const logger = commonlibLogger;

const downloadIndicatorInterval = 1000; // same as vscode-dotnet-runtime

export function checkerEnabled(key: string): boolean {
  const configuration: WorkspaceConfiguration = workspace.getConfiguration(configurationPrefix);
  return configuration.get<boolean>(key, false);
}

export async function runWithProgressIndicator(
  outputChannel: OutputChannel,
  callback: () => Promise<void>
): Promise<void> {
  const timer = setInterval(() => outputChannel.append("."), downloadIndicatorInterval);
  try {
    await callback();
  } finally {
    outputChannel.appendLine("");
    clearTimeout(timer);
  }
}

export async function displayLearnMoreMessage(message?: string): Promise<boolean> {
  throw new Error("Not implemented");
}

export async function displayWarningMessage(
  message: string,
  buttonText: string,
  action: () => Promise<boolean>
): Promise<boolean> {
  throw new Error("Not implemented");
}
