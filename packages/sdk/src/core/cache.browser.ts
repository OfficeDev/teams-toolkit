// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * Configuration used in initialization.
 * @internal
 */
class Cache {
  public static get(key: string): string | null {
    return sessionStorage.getItem(key);
  }

  public static set(key: string, value: string): void {
    sessionStorage.setItem(key, value);
  }

  public static remove(key: string): void {
    sessionStorage.removeItem(key);
  }

  public static clear(): void {
    sessionStorage.clear();
  }
}

export { Cache };
