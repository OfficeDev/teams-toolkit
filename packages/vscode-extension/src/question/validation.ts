// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ConfigMap,
  FileValidation,
  LocalFuncValidation,
  RemoteFuncValidation,
  StringArrayValidation,
  Validation,
} from "fx-api";
import * as fs from "fs-extra";
import { CoreProxy } from "fx-core";
import * as jsonschema from "jsonschema";

let core: CoreProxy;

export function getValidationFunction(
  validation?: Validation,
  answers?: ConfigMap
): (input: string | string[] | undefined) => Promise<string | undefined | null> {
  return async function(input: string | string[] | undefined): Promise<string | undefined | null> {
    if (!validation) return undefined;
    const validRes = await validate(validation, input, answers);
    return validRes;
  };
}

export async function validate(
  validation: Validation,
  valueToValidate: any,
  answers?: ConfigMap
): Promise<string | undefined> {
  if (!validation) {
    return undefined;
  }

  if (validation.required === true && !valueToValidate) {
    return `${valueToValidate} does not meet required condition`;
  }

  /// callFunc validation
  const funcValidation: RemoteFuncValidation = validation as RemoteFuncValidation;
  if (funcValidation.method) {
    //function validation
    core = CoreProxy.getInstance();
    funcValidation.params = valueToValidate;
    const res = await core.callFunc(funcValidation, answers);
    if (res.isOk()) {
      return res.value as string;
    } else {
      return undefined; // when callFunc failed, skip the validation
    }
  }

  ///local function validation
  const localFuncValidation: LocalFuncValidation = validation as LocalFuncValidation;
  if (localFuncValidation.validFunc) {
    const res = await localFuncValidation.validFunc(valueToValidate as string);
    return res as string;
  }

  ///file validation
  const fileValidation: FileValidation = validation as FileValidation;
  if (fileValidation.exists || fileValidation.notExist) {
    const path = valueToValidate as string;
    if (!path) {
      return `path should not be empty!`;
    }
    if (fileValidation.exists) {
      const exists = await fs.pathExists(path!);
      if (!exists) {
        return `path not exists:'${path}'`;
      }
    }
    if (fileValidation.notExist) {
      const exists = await fs.pathExists(path!);
      if (exists) {
        return `path already exists:${path}`;
      }
    }
    return undefined;
  }

  // normal validation
  const schema: any = { ...validation };

  if (validation.equals) {
    schema.const = validation.equals;
    delete schema.equals;
  }

  const validateResult = jsonschema.validate(valueToValidate, schema);
  if (validateResult.errors && validateResult.errors.length > 0) {
    return validateResult.errors[0].message;
  }

  const startsWith: string = (validation as any)["startsWith"];
  if (startsWith) {
    if (!String(valueToValidate).startsWith(startsWith)) {
      return `'${valueToValidate}' does not meet startsWith '${startsWith}'`;
    }
  }

  const endsWith: string = (validation as any)["endsWith"];
  if (endsWith) {
    if (!String(valueToValidate).endsWith(endsWith)) {
      return `'${valueToValidate}' does not meet endsWith '${endsWith}'`;
    }
  }
  const contains: string = (validation as any)["contains"];
  if (contains) {
    if (!valueToValidate.includes(contains)) {
      return `'${valueToValidate}' does not meet contains '${contains}'`;
    }
  }

  const arrayValidation: StringArrayValidation = validation as StringArrayValidation;
  if (arrayValidation.containsAll) {
    const containsAll: string[] = arrayValidation.containsAll;
    if (containsAll.length > 0) {
      const array = valueToValidate as string[];
      for (const i of containsAll) {
        if (!array.includes(i)) {
          return `'${array}' does not meet containsAll '${containsAll}'`;
        }
      }
    }
  }

  if (arrayValidation.containsAny) {
    const containsAny: string[] = arrayValidation.containsAny;
    if (containsAny.length > 0) {
      const array = valueToValidate as string[];
      let found = false;
      for (const i of containsAny) {
        if (array.includes(i)) {
          found = true;
          break;
        }
      }
      if (!found) {
        return `'${array}' does not meet containsAny '${containsAny}'`;
      }
    }
  }

  return undefined;
}
 