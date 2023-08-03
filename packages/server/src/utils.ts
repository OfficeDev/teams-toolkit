// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  err,
  FxError,
  MultiSelectConfig,
  ok,
  OptionItem,
  Result,
  StaticOptions,
  SystemError,
  UIConfig,
  UserError,
} from "@microsoft/teamsfx-api";
import { assembleError } from "@microsoft/teamsfx-core";
import { CustomizeFuncRequestType, IServerFxError } from "./apis";
import { setFunc } from "./customizedFuncAdapter";

export async function getResponseWithErrorHandling<T>(
  promise: Promise<Result<T, FxError>>
): Promise<Result<T, FxError>> {
  return new Promise((resolve) => {
    promise
      .then((v) => {
        if ("error" in v && v.error != null) {
          if (v.error instanceof UserError || v.error instanceof SystemError) {
            resolve(err(v.error));
          } else if ((v.error as any).errorType === "UserError") {
            const userError = new UserError({
              message: v.error.message,
              source: v.error.source,
              name: v.error.name,
              helpLink: (v.error as any).helpLink,
              displayMessage: (v.error as any).displayMessage,
            });
            userError.stack = v.error.stack;
            userError.timestamp = v.error.timestamp;
            userError.userData = v.error.userData;
            userError.innerError = v.error.innerError;
            resolve(err(userError));
          } else {
            const systemError = new SystemError({
              message: v.error.message,
              source: v.error.source,
              name: v.error.name,
              issueLink: (v.error as any).issueLink,
              displayMessage: (v.error as any).displayMessage,
            });
            systemError.stack = v.error.stack;
            systemError.timestamp = v.error.timestamp;
            systemError.userData = v.error.userData;
            systemError.innerError = v.error.innerError;
            resolve(err(systemError));
          }
        } else {
          if ("value" in v && v.value !== null) {
            resolve(ok(v.value));
          } else {
            resolve(ok(undefined as any));
          }
        }
      })
      .catch((e) => {
        resolve(err(assembleError(e, "Fx-VS")));
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
      displayMessage: (result.error as any).displayMessage,
    });
  }
  return ok(result.value);
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
  if (typeof target === "object" && Object.keys(target).length > 0) {
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
