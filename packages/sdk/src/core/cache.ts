// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CacheClass } from "memory-cache";

const cache = new CacheClass<string, string>();

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
    return cache.get(key);
  }

  public static set(key: string, value: string): void {
    cache.put(key, value);
  }

  public static remove(key: string): void {
    cache.del(key);
  }

  public static clear(): void {
    cache.clear();
  }
}

export { Cache };
