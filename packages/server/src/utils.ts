// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { HandlerResult, ResponseError } from "vscode-jsonrpc";

import {
  assembleError,
  err,
  FxError,
  MultiSelectConfig,
  ok,
  OptionItem,
  Result,
  StaticOptions,
  UIConfig,
  UserError,
} from "@microsoft/teamsfx-api";

import { CustomizeFuncRequestType, IServerFxError } from "./apis";
import { setFunc } from "./customizedFuncAdapter";

export async function getResponseWithErrorHandling<T>(
  promise: Promise<T>
): Promise<Result<T, FxError>> {
  return new Promise(async (resolve) => {
    promise
      .then((v) => {
        resolve(ok(v));
      })
      .catch((e) => {
        /// TODO: this part needs to be refined.
        if (e.data) {
          const fxError = e.data as FxError;
          fxError.source = "VS";
          resolve(err(fxError));
        } else resolve(err(assembleError(e)));
      });
  });
}

export function convertUIConfigToJson<T>(config: UIConfig<T>): UIConfig<T> {
  const newConfig = deepCopy(config);
  if ("options" in newConfig) {
    let options: StaticOptions = (newConfig as any).options;
    if (options.length > 0 && typeof options[0] === "string") {
      options = options.map((op) => <OptionItem>{ id: op, label: op });
      (newConfig as any).options = options;
    }
  }
  if (config.validation) {
    const funcId = setFunc(config.validation);
    (newConfig as any).validation = <CustomizeFuncRequestType>{ type: "ValidateFunc", id: funcId };
  }
  if ("onDidChangeSelection" in config && (config as MultiSelectConfig).onDidChangeSelection) {
    const funcId = setFunc((config as MultiSelectConfig).onDidChangeSelection!);
    (newConfig as any).validation = <CustomizeFuncRequestType>{
      type: "OnSelectionChangeFunc",
      id: funcId,
    };
  }
  return newConfig;
}

export function standardizeResult<R>(result: Result<R, FxError>): Result<R, FxError> {
  if (result.isErr()) {
    const errorType = result.error instanceof UserError ? "UserError" : "SystemError";
    return err<R, IServerFxError>({
      errorType: errorType,
      source: result.error.source,
      name: result.error.name,
      message: result.error.message,
      stack: result.error.stack,
      innerError: result.error.innerError,
      userData: result.error.userData,
      timestamp: result.error.timestamp,
      helpLink: (result.error as any).helpLink,
      issueLink: (result.error as any).issueLink,
    });
  }
  return ok(result.value);
}

export function convertToHandlerResult<R>(result: Result<R, FxError>): HandlerResult<R, FxError> {
  if (result.isOk()) return result.value;
  else {
    const fxError: FxError = result.error;
    return new ResponseError(-32000, fxError.message, fxError);
  }
}

export const deepCopy = <T>(target: T): T => {
  if (target === null) {
    return target;
  }
  if (target instanceof Date) {
    return new Date(target.getTime()) as any;
  }
  if (target instanceof Array) {
    const cp = [] as any[];
    (target as any[]).forEach((v) => {
      cp.push(v);
    });
    return cp.map((n: any) => deepCopy<any>(n)) as any;
  }
  if (typeof target === "object" && target !== {}) {
    const cp = { ...(target as { [key: string]: any }) } as {
      [key: string]: any;
    };
    Object.keys(cp).forEach((k) => {
      cp[k] = deepCopy<any>(cp[k]);
    });
    return cp as T;
  }
  return target;
};
