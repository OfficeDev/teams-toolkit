// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export class RetryHandler {
    public static readonly defaultMaxRetries = 3;
    public static async retry<T>(
        fn: (retries: number) => Promise<T>,
        maxRetries?: number
    ): Promise<T> {
        let executionIndex = 0;
        let error = undefined;
        while (executionIndex <= (maxRetries ?? this.defaultMaxRetries)) {
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
