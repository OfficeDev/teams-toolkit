// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { VSBrowser } from "vscode-extension-tester";

export class RetryHandler {
  public static async retry<T>(
    fn: (retries: number) => Promise<T>,
    maxRetries = 5,
    delayTimeSpan = 1000
  ): Promise<T> {
    let executionIndex = 0;
    let error = undefined;
    while (executionIndex <= maxRetries) {
      await delay(executionIndex * delayTimeSpan);

      try {
        const response = await fn(executionIndex);
        return response;
      } catch (e: any) {
        error = e;
        console.log(`[Retry ${executionIndex}] ${e.message}`);
        ++executionIndex;
      }
    }
    try {
      await VSBrowser.instance.takeScreenshot("error");
    } catch (e: any) {
      console.log("Failed to take screen shot.");
    }
    throw error;
  }
}

export function delay(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  // tslint:disable-next-line no-string-based-set-timeout
  return new Promise((resolve) => setTimeout(resolve, ms));
}
