// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import commonlibLogger from "../../commonlib/log";
import { OutputChannel } from "vscode";

export { isWindows, isLinux, isMacOS } from "../../utils/commonUtils";
export { cpUtils } from "../cpUtils";
export const logger = commonlibLogger;
export { displayWarningMessage, displayLearnMore } from "../commonUtils";

const downloadIndicatorInterval = 1000; // same as vscode-dotnet-runtime

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
