// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Retry } from "./constants";
export class RetryHandler {
  public static async Retry<T>(
    fn: () => Promise<T> | T,
    ignoreError = false
  ): Promise<T | undefined> {
    let retries = Retry.RETRY_TIMES;
    while (retries > 0) {
      retries = retries - 1;
      try {
        return await fn();
      } catch (e) {
        if (retries <= 0) {
          if (!ignoreError) throw e;
        } else {
          await new Promise((resolve) => setTimeout(resolve, Retry.BACKOFF_TIME_MS));
        }
      }
    }
    return undefined;
  }
}
