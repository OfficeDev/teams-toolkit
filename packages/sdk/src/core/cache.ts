// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

const cache: Record<string, string> = {};

/**
 * Cache based on memory.
 *
 * @remarks
 * It will be used in server SDK.
 *
 * @internal
 */
class Cache {
  public static get(key: string): string | null {
    if (cache[key] === undefined) {
      return null;
    }
    return cache[key];
  }

  public static set(key: string, value: string): void {
    cache[key] = value;
  }

  public static remove(key: string): void {
    delete cache[key];
  }
}

export { Cache };
