// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ProjectConstants } from "../constants";

export class RetryHandler {
    public static async retry<T>(
        fn: (retries : number) => Promise<T>
    ): Promise<T> {
        let executionIndex: number = 0;
        let error = undefined;
        while (executionIndex <= ProjectConstants.maxRetries) {
            await delay(executionIndex * 1000);

            try {
                const response = await fn(executionIndex);
                return response;
            } catch (e) {
                error = e;
                ++executionIndex;
            }
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
