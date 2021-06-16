// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ProjectConstants } from "../constants";

export function getFileExtension(filePath: string): string {
  const basename = filePath.split(/[\\/]/).pop();
  if (!basename) {
    return "";
  }

  const pos = basename.lastIndexOf(".");
  if (basename === "" || pos < 1) {
    return "";
  }

  return basename.slice(pos + 1);
}

export function capitalizeFirstLetter(str: string): string {
  const firstLetter = str.length > 0 ? str.charAt(0).toUpperCase() : "";
  const nextLetters = str.length > 1 ? str.slice(1) : "";
  return firstLetter + nextLetters;
}

export class RetryHandler {
  public static async retry<T>(
    fn: (retries: number) => Promise<T>,
    maxRetries?: number,
    retryTimeInterval?: number
  ): Promise<T> {
    let executionIndex = 0;
    let error = undefined;
    while (executionIndex <= (maxRetries ?? ProjectConstants.maxRetries)) {
      await delay(executionIndex * (retryTimeInterval ?? ProjectConstants.retryTimeInterval));

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

interface FactoryFunc<TResult> {
  (): TResult;
}

// Do not support parallel execution
export class Lazy<T> {
  private readonly factoryFunc: FactoryFunc<Promise<T>>;
  factoryOutput: T | undefined;

  constructor(factoryFunc: FactoryFunc<Promise<T>>) {
    this.factoryFunc = factoryFunc;
  }

  async getValue(): Promise<T> {
    if (typeof this.factoryOutput === "undefined") {
      this.factoryOutput = await this.factoryFunc();
    }
    return this.factoryOutput;
  }
}
