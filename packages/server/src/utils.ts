// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { HandlerResult, MessageConnection, ResponseError } from "vscode-jsonrpc";

import {
  assembleError,
  err,
  FxError,
  MultiSelectConfig,
  ok,
  Result,
  UIConfig,
} from "@microsoft/teamsfx-api";

import { CustomizeFuncRequestType } from "./apis";
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

export async function sendRequest(
  connection: MessageConnection,
  type: any,
  ...args: any[]
): Promise<Result<any, FxError>> {
  return new Promise(async (resolve) => {
    let promise;
    if (args.length === 0) {
      promise = connection.sendRequest(type);
    } else if (args.length === 1) promise = connection.sendRequest(type, args[0]);
    else if (args.length === 2) promise = connection.sendRequest(type, args[0], args[1]);
    else if (args.length === 3) promise = connection.sendRequest(type, args[0], args[1], args[2]);
    else if (args.length === 4)
      promise = connection.sendRequest(type, args[0], args[1], args[2], args[3]);
    else if (args.length === 5)
      promise = connection.sendRequest(type, args[0], args[1], args[2], args[3], args[4]);
    else if (args.length === 6)
      promise = connection.sendRequest(type, args[0], args[1], args[2], args[3], args[4], args[5]);
    else if (args.length === 7)
      promise = connection.sendRequest(
        type,
        args[0],
        args[1],
        args[2],
        args[3],
        args[4],
        args[5],
        args[6]
      );
    else if (args.length === 8)
      promise = connection.sendRequest(
        type,
        args[0],
        args[1],
        args[2],
        args[3],
        args[4],
        args[5],
        args[6],
        args[7]
      );
    else
      promise = connection.sendRequest(
        type,
        args[0],
        args[1],
        args[2],
        args[3],
        args[4],
        args[5],
        args[6],
        args[7],
        args[8]
      );
    promise
      .then((v) => {
        resolve(ok(v));
      })
      .catch((e) => {
        if (e.data) {
          const fxError = e.data as FxError;
          fxError.source = "VS";
          resolve(err(fxError));
        } else resolve(err(assembleError(e)));
      });
  });
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
