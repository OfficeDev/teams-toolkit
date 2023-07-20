// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { BaseComponentInnerError, PrerequisiteError } from "../error/componentError";
import {
  err,
  FxError,
  LogProvider,
  ok,
  Result,
  SystemError,
  UserError,
} from "@microsoft/teamsfx-api";
import path from "path";
import { ExecutionResult } from "../driver/interface/stepDriver";
import { getLocalizedString } from "../../common/localizeUtils";

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

export function asOptional<T>(as: (s: unknown, key: string, helpLink?: string) => T) {
  return function (s: unknown, key: string, helpLink?: string): T | undefined {
    if (s === undefined || s === null) {
      return undefined;
    }
    return as(s, key, helpLink);
  };
}

export function asBoolean(s: unknown, key: string, helpLink?: string): boolean {
  if (typeof s === "boolean") {
    return s;
  } else if (typeof s === "string") {
    return s === "true";
  }
  throw PrerequisiteError.somethingMissing("Deploy", key, helpLink);
}

export function asString(s: unknown, key: string, helpLink?: string): string {
  if (typeof s === "string") {
    return s as string;
  }
  throw PrerequisiteError.somethingMissing("Deploy", key, helpLink);
}

type KeyValidators<T> = {
  [P in keyof T]-?: (s: unknown, key: string, helpLink?: string) => T[P];
};

export function asFactory<T>(keyValidators: KeyValidators<T>) {
  return function (data: unknown, helpLink?: string): T {
    if (typeof data === "object" && data !== null) {
      const maybeT = data as unknown as T;
      for (const key of Object.keys(keyValidators) as Array<keyof T>) {
        keyValidators[key](maybeT[key], `${String(key)}`, helpLink);
      }
      return maybeT;
    }
    throw PrerequisiteError.somethingIllegal(
      "Deploy",
      "data",
      "plugins.bot.InvalidData",
      undefined,
      helpLink
    );
  };
}

export async function wrapRun(
  exec: () => Promise<Map<string, string>>,
  errorHandler?: () => Promise<void>,
  logProvider?: LogProvider
): Promise<Result<Map<string, string>, FxError>> {
  try {
    return ok(await exec());
  } catch (error) {
    if (errorHandler) {
      await errorHandler();
    }
    if (error instanceof BaseComponentInnerError) {
      if (error.detail) {
        await logProvider?.debug(`Error occurred: ${error.detail}`);
      }
      return err(error.toFxError());
    } else if (error instanceof UserError || error instanceof SystemError) {
      return err(error);
    }
    // always return error as SystemError
    return err(BaseComponentInnerError.unknownError("Deploy", error).toFxError());
  }
}

export async function wrapSummary(
  exec: () => Promise<Result<Map<string, string>, FxError>>,
  summary: string[]
): Promise<ExecutionResult> {
  const result = await exec();
  if (result.isOk()) {
    const summaries = summary.map((s) => getLocalizedString(s));
    return { result, summaries };
  } else {
    const summaries: string[] = [];
    return { result, summaries };
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

export function getAbsolutePath(relativeOrAbsolutePath: string, projectPath: string): string {
  relativeOrAbsolutePath = relativeOrAbsolutePath || "";
  projectPath = projectPath || "";
  return path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.join(projectPath, relativeOrAbsolutePath);
}
