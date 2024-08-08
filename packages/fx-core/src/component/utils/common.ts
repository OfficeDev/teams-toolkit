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
import fs from "fs-extra";
import stripBom from "strip-bom";

const placeholderRegex = /\${{ *[a-zA-Z_][a-zA-Z0-9_]* *}}/g;

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
    return s;
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
  errorSource: string,
  errorHandler?: () => Promise<void>,
  logProvider?: LogProvider
): Promise<Result<Map<string, string>, FxError>> {
  try {
    return ok(await exec());
  } catch (error) {
    return await errorHandle(error, errorSource, logProvider, errorHandler);
  }
}

export async function errorHandle(
  error: unknown,
  errorSource: string,
  logProvider?: LogProvider,
  errorHandler?: () => Promise<void>
): Promise<Result<Map<string, string>, FxError>> {
  if (errorHandler) {
    await errorHandler();
  }
  if (error instanceof BaseComponentInnerError) {
    if (error.detail) {
      logProvider?.debug(`Error occurred: ${error.detail}`);
    }
    return err(error.toFxError());
  } else if (error instanceof UserError || error instanceof SystemError) {
    return err(error);
  }
  // always return error as SystemError
  return err(BaseComponentInnerError.unknownError(errorSource, error).toFxError());
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
export function expandEnvironmentVariable(
  content: string,
  envs?: { [key in string]: string }
): string {
  const placeholders = content.match(placeholderRegex);
  if (placeholders) {
    for (const placeholder of placeholders) {
      const envName = placeholder.slice(3, -2).trim(); // removes `${{` and `}}`
      const envValue = envs ? envs[envName] : process.env[envName];
      if (envName === "APP_NAME_SUFFIX") {
        if (envValue !== undefined && envValue !== null) {
          content = content.replace(placeholder, envValue);
        }
      } else {
        if (envValue) {
          content = content.replace(placeholder, envValue);
        }
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

// export function getVariablesInFunctions(content: string): string[] {
//   const regex =/\${{ *[a-zA-Z_][a-zA-Z0-9_() ]*\) *}}/g;
//   const matches = content.match(regex)
//   const variables = [];

//   if(!matches){
//     return [];
//   }
//   for(const placeholder of matches){
//     const variable = checkValidFunction(placeholder.slice(3, -2).trim());
//     if(variable) {
//       variables.push(variable);
//     }
//   }

//   return variables;
// }
// function can only be used in root file, manifest.json
export function expandVariableWithFunctionV2(
  content: string, // content has been replaced with values in   // const placeholderRegex = /\${{ *[a-zA-Z_][a-zA-Z0-9_]* *}}/g; ENV
  envs?: { [key in string]: string },
  isJson?: boolean
): string {
  const regex = /\$\[ *[a-zA-Z][a-zA-Z]*\(.*\) *\]/g;
  const matches = content.match(regex);

  if (!matches) {
    return content;
  }
  for (const placeholder of matches) {
    let value = processFunctionV2(placeholder.slice(2, -1).trim(), envs);
    if (isJson && value) {
      value = JSON.stringify(value).slice(1, -1);
    }
    if (value) {
      console.log("value");
      console.log(value);
      content = content.replace(placeholder, value);
    }
  }
  return content;
}

export function processFunctionV2(
  content: string | undefined,
  envs?: { [key in string]: string }
): string | undefined {
  // undefined means it is invalid.
  if (!content) {
    return undefined;
  }

  const firstTrimmedContent = content.trim();
  if (!firstTrimmedContent.startsWith("file(") || !firstTrimmedContent.endsWith(")")) {
    console.log("Only file() function is supported.");
  }

  // file()
  const trimmedContent = content.slice(5, -1).trim(); // content inside () and trimmed.
  console.log("trimmed content inside function: " + trimmedContent);
  if (
    (trimmedContent[0] === "'" && trimmedContent[trimmedContent.length - 1] === "'") ||
    (trimmedContent[0] === '"' && trimmedContent[trimmedContent.length - 1] === '"')
  ) {
    // static string as function parameter
    const res = readFileContent(trimmedContent.substring(1, trimmedContent.length - 1));
    console.log(res);
    return res;
  } else if (trimmedContent.startsWith("${{") && trimmedContent.endsWith("}}")) {
    // env variable inside
    const content = expandEnvironmentVariable(trimmedContent, envs);
    console.log("env processed content: " + content);

    const res = readFileContent(content);
    console.log(res);
  } else if (trimmedContent.startsWith("file(") && trimmedContent.endsWith(")")) {
    // nested function inside
    const content = processFunctionV2(trimmedContent, envs);
    console.log("nested processed content: " + (!content ? "undefined" : content));

    if (content) {
      const res = readFileContent(content);
      console.log(res);
    } else {
      console.log("nested function is invalid");
      return undefined;
    }
  } else {
    // invalid content inside function
    console.log("the parameters is invalid. It can be '', \"\", ${{}} or a nested function");
  }
}

function readFileContent(filePath: string) {
  if (filePath) {
    if (fs.existsSync(filePath)) {
      let fileContent = fs.readFileSync(filePath, "utf8");
      console.log("fileContent:");
      //console.log(JSON.stringify("You are a declarative copilot and were created with 'Team Toolkit'. \\"));
      fileContent = stripBom(fileContent);

      const processedFileContent = expandEnvironmentVariable(fileContent);
      return processedFileContent;
    }
  }
}

export function expandVariableWithFunction(
  content: string,
  envs?: { [key in string]: string },
  isJson?: boolean
): string {
  const regex = /\$[ *[a-zA-Z_][a-zA-Z0-9_() ]*\) *]/g;
  const matches = content.match(regex);

  if (!matches) {
    return content;
  }
  for (const placeholder of matches) {
    let value = processFunction(placeholder.slice(2, -1).trim(), envs);
    if (isJson && value) {
      value = JSON.stringify(value).slice(1, -1);
    }
    if (value) {
      console.log("value");
      console.log(value);
      content = content.replace(placeholder, value);
    }
  }
  return content;
}

export function processFunction(
  content: string | undefined,
  envs?: { [key in string]: string }
): string | undefined {
  // undefined means it is invalid.
  if (!content) {
    return undefined;
  }
  if (!content.includes("(") && !content.includes(")")) {
    // variable name.
    const trimmedContent = content.trim();
    if (trimmedContent.includes(" ") || !trimmedContent) {
      return undefined;
    } else {
      return envs ? envs[trimmedContent] : process.env[trimmedContent];
    }
  } else {
    const beginingBracket = content.indexOf("(");
    if (content[content.length - 1] !== ")") {
      return undefined;
    }
    const funcName = content.substring(0, beginingBracket);
    if (!allowedFunc.includes(funcName)) {
      return undefined;
    }

    if (funcName === "file") {
      const filePath = processFunction(
        content.substring(beginingBracket + 1, content.length - 1),
        envs
      );
      if (filePath) {
        if (fs.existsSync(filePath)) {
          let fileContent = fs.readFileSync(filePath, "utf8");
          console.log("fileContent:");
          //console.log(JSON.stringify("You are a declarative copilot and were created with 'Team Toolkit'. \\"));
          fileContent = stripBom(fileContent);
          return funcName === "file" ? fileContent : JSON.stringify(fileContent).slice(1, -1);
        }
      }
    }

    return undefined;
  }
}

const allowedFunc = ["file"]; // only file function with single parameter is allowed.

// function checkValidFunction(content: string | undefined): string | undefined { // undefined means it is invalid.
//   if(!content) {
//     return undefined;
//   }
//   if(!content.includes('(') && !content.includes(')')) {
//     // variable name.
//     const trimmedContent = content.trim();
//     if(trimmedContent.includes(' ') ||!trimmedContent) {
//       return undefined;
//     } else {
//       return trimmedContent;

//     }
//   } else {
//     const beginingBracket = content.indexOf('(');
//     if(content[content.length -1] !== ')') {
//       return undefined;
//     }
//     const funcName = content.substring(0, beginingBracket);
//     if(!allowedFunc.includes(funcName)){
//       return undefined;
//     }

//     return checkValidFunction(content.substring(beginingBracket+1, content.length -1));
//   }
// }
