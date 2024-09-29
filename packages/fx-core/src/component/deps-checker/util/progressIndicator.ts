// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DepsLogger } from "../depsLogger";

const downloadIndicatorInterval = 1000; // same as vscode-dotnet-runtime

export async function runWithProgressIndicator(
  callback: () => Promise<void>,
  logger: DepsLogger
): Promise<void> {
  const timer = setInterval(() => logger.append("."), downloadIndicatorInterval);
  try {
    await callback();
  } finally {
    clearTimeout(timer);
    logger.appendLine("");
  }
}
