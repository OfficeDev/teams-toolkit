// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Retry } from "../constants";
export class RetryHandler {
  public static async Retry(fn: () => Promise<any>, ignoreError = false): Promise<any | undefined> {
    let retries = Retry.RETRY_TIMES;
    let response;
    while (retries > 0) {
      retries = retries - 1;
      try {
        response = await fn();
        return response;
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
