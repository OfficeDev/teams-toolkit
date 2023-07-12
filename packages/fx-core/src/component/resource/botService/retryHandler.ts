// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Qianhao Dong <qidon@microsoft.com>
 */
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
      } catch (e: any) {
        // Directly throw 404 error, keep trying for other status code e.g. 503 400 500
        if (retries <= 0 || [401, 403, 404, 429].includes(e.response?.status)) {
          if (!ignoreError) throw e;
        } else {
          await new Promise((resolve) => setTimeout(resolve, Retry.BACKOFF_TIME_MS));
        }
      }
    }
    return undefined;
  }
}
