// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { PrerequisiteError } from "../error/componentError";

/**
 * check parameter, throw error if value is null or undefined
 * @param name parameter name
 * @param value parameter value
 */
export function checkMissingArgs<T>(name: string, value: T | null | undefined): T {
  if (!value) {
    throw PrerequisiteError.somethingMissing("Deploy", name);
  }
  return value;
}

export function asOptional<T>(as: (s: unknown, key: string) => T) {
  return function (s: unknown, key: string): T | undefined {
    if (s === undefined) {
      return s;
    }
    return as(s, key);
  };
}

export function asString(s: unknown, key: string): string {
  if (typeof s === "string") {
    return s as string;
  }
  throw PrerequisiteError.somethingMissing("Deploy", key);
}

export function asNumber(s: unknown, key: string): number {
  if (typeof s === "number") {
    return s as number;
  }
  throw PrerequisiteError.somethingMissing("Deploy", key);
}

type KeyValidators<T> = {
  [P in keyof T]-?: (s: unknown, key: string) => T[P];
};

export function asFactory<T>(keyValidators: KeyValidators<T>) {
  return function (data: unknown): T {
    console.log(data);
    if (typeof data === "object" && data !== null) {
      const maybeT = data as unknown as T;
      for (const key of Object.keys(keyValidators) as Array<keyof T>) {
        keyValidators[key](maybeT[key], `${key}`);
      }
      return maybeT;
    }
    throw PrerequisiteError.somethingIllegal("Deploy", "data", "plugins.bot.InvalidData");
  };
}
