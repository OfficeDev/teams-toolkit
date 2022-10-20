// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { BaseComponentInnerError, PrerequisiteError } from "../error/componentError";
import { err, FxError, ok, Result, SystemError, UserError } from "@microsoft/teamsfx-api";

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

export function asBoolean(s: unknown, key: string): boolean {
  if (typeof s === "boolean") {
    return s;
  } else if (typeof s === "string") {
    return s === "true";
  }
  throw PrerequisiteError.somethingMissing("Deploy", key);
}

export function asString(s: unknown, key: string): string {
  if (typeof s === "string") {
    return s as string;
  }
  throw PrerequisiteError.somethingMissing("Deploy", key);
}

export function asRecord(s: unknown, key: string): Record<string, string> {
  if (s instanceof Object) {
    return s as Record<string, string>;
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

export async function wrapRun(
  exec: () => Promise<Map<string, string>>,
  errorHandler?: () => Promise<void>
): Promise<Result<Map<string, string>, FxError>> {
  try {
    return ok(await exec());
  } catch (error) {
    if (errorHandler) {
      console.debug("Error handler is called.");
      await errorHandler();
    }
    if (error instanceof BaseComponentInnerError) {
      return err(error.toFxError());
    } else if (error instanceof UserError || error instanceof SystemError) {
      return err(error);
    }
    throw error;
  }
}

// Expand environment variables in content. The format of referencing environment variable is: ${{ENV_NAME}}
export function expandEnvironmentVariable(content: string): string {
  const placeholderRegex = /\${{ *[a-zA-Z_][a-zA-Z0-9_]* *}}/g;
  const placeholders = content.match(placeholderRegex);

  if (placeholders) {
    for (const placeholder of placeholders) {
      const envName = placeholder.slice(3, -2).trim(); // removes `${{` and `}}`
      const envValue = process.env[envName];
      if (envValue) {
        content = content.replace(placeholder, envValue);
      }
    }
  }

  return content;
}

/**
 * Expand environment variables in content. The format of referencing environment variable is: ${{ENV_NAME}}
 * @return An array of environment variables
 */
export function getEnvironmentVariables(content: string): string[] {
  const placeholderRegex = /\${{ *[a-zA-Z_][a-zA-Z0-9_]* *}}/g;
  const placeholders = content.match(placeholderRegex);
  if (placeholders) {
    const variables = placeholders.map((placeholder) => placeholder.slice(3, -2).trim()); // removes `${{` and `}}`)
    // remove duplicates
    return [...new Set(variables)];
  }
  return [];
}

/**
 * compare two key-value pairs, return true if they are exactly same
 * @param kv1 parameter the first key-value pair
 * @param kv2 parameter the first key-value pair
 */
export function isKvPairEqual<T>(kv1: { [key: string]: T }, kv2: { [key: string]: T }): boolean {
  const _compare = (l: { [key: string]: T }, r: { [key: string]: T }) =>
    !Object.keys(l).some((key) => r[key] !== l[key]);

  return _compare(kv1, kv2) && _compare(kv2, kv1);
}
