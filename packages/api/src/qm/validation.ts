// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
    FileValidation,
    RemoteFuncValidation,
    LocalFuncValidation,
    NumberValidation,
    StringArrayValidation,
    StringValidation,
    Validation,
    Func,
} from "./question";
import * as fs from "fs-extra";
import * as jsonschema from "jsonschema";
import { Result } from "neverthrow";
import { FxError } from "../error";
import { ConfigMap, Inputs } from "../config";
import { Stage } from "../constants";

export type RemoteFuncExecutor = (
    func: Func,
    answers: Inputs | ConfigMap,
    stage: Stage,
) => Promise<Result<unknown, FxError>>;

export function getValidationFunction(
    validation: Validation,
    outputs: Inputs | ConfigMap,
    stage: Stage,
    remoteFuncValidator?: RemoteFuncExecutor,
): (input: string | string[]) => Promise<string | undefined> {
    return async function (
        input: string | string[],
    ): Promise<string | undefined> {
        return await validate(
            validation,
            input,
            outputs,
            stage,
            remoteFuncValidator,
        );
    };
}

export async function validate(
    validation: Validation,
    valueToValidate: string | string[],
    inputs: Inputs | ConfigMap,
    stage: Stage,
    remoteFuncValidator?: RemoteFuncExecutor,
): Promise<string | undefined> {
    //RemoteFuncValidation
    {
        const funcValidation: RemoteFuncValidation = validation as RemoteFuncValidation;
        if (funcValidation.method && remoteFuncValidator) {
            funcValidation.params = valueToValidate as string;
            const res = await remoteFuncValidator(
                funcValidation as Func,
                inputs,
                stage,
            );
            if (res.isOk()) {
                return res.value as string;
            } else {
                return undefined; // when callFunc failed, skip the validation
            }
        }
    }

    {
        //LocalFuncValidation
        const localFuncValidation: LocalFuncValidation = validation as LocalFuncValidation;
        if (localFuncValidation.validFunc) {
            const res = await localFuncValidation.validFunc(
                valueToValidate as string,
            );
            return res as string;
        }
    }

    {
        //FileValidation
        const fileValidation: FileValidation = validation as FileValidation;
        if (fileValidation.exists || fileValidation.notExist) {
            const path = valueToValidate as string;
            if (!path) {
                return `path should not be empty!`;
            }
            if (fileValidation.exists) {
                const exists = await fs.pathExists(path);
                if (!exists) {
                    return `path not exists:'${path}'`;
                }
            }
            if (fileValidation.notExist) {
                const exists = await fs.pathExists(path);
                if (exists) {
                    return `path already exists:${path}`;
                }
            }
            return undefined;
        }
    }

    {
        // StringValidation
        const stringValidation: StringValidation = validation as StringValidation;
        const strToValidate = valueToValidate as string;
        if (typeof strToValidate === "string") {
            const schema: any = {};
            if (
                stringValidation.equals &&
                typeof stringValidation.equals === "string"
            )
                schema.const = stringValidation.equals;
            if (
                stringValidation.enum &&
                stringValidation.enum.length > 0 &&
                typeof stringValidation.enum[0] === "string"
            )
                schema.enum = stringValidation.enum;
            if (stringValidation.minLength)
                schema.minLength = stringValidation.minLength;
            if (stringValidation.maxLength)
                schema.maxLength = stringValidation.maxLength;
            if (stringValidation.pattern)
                schema.pattern = stringValidation.pattern;
            if (Object.keys(schema).length > 0) {
                const validateResult = jsonschema.validate(
                    valueToValidate,
                    schema,
                );
                if (validateResult.errors && validateResult.errors.length > 0) {
                    return `'${strToValidate}' ${validateResult.errors[0].message}`;
                }
            }

            if (stringValidation.startsWith) {
                if (!strToValidate.startsWith(stringValidation.startsWith)) {
                    return `'${strToValidate}' does not meet startsWith:'${stringValidation.startsWith}'`;
                }
            }
            if (stringValidation.endsWith) {
                if (!strToValidate.endsWith(stringValidation.endsWith)) {
                    return `'${strToValidate}' does not meet endsWith:'${stringValidation.endsWith}'`;
                }
            }
            if (
                stringValidation.includes &&
                typeof strToValidate === "string"
            ) {
                if (!strToValidate.includes(stringValidation.includes)) {
                    return `'${strToValidate}' does not meet includes:'${stringValidation.includes}'`;
                }
            }
        }
    }

    //NumberValidation
    {
        const numberValidation: NumberValidation = validation as NumberValidation;
        const numberToValidate = Number(valueToValidate);
        const schema: any = {};
        if (
            numberValidation.equals &&
            typeof numberValidation.equals === "number"
        )
            schema.const = numberValidation.equals;
        if (numberValidation.multipleOf)
            schema.multipleOf = numberValidation.multipleOf;
        if (numberValidation.maximum) schema.maximum = numberValidation.maximum;
        if (numberValidation.exclusiveMaximum)
            schema.exclusiveMaximum = numberValidation.exclusiveMaximum;
        if (numberValidation.minimum) schema.minimum = numberValidation.minimum;
        if (numberValidation.exclusiveMinimum)
            schema.exclusiveMinimum = numberValidation.exclusiveMinimum;
        if (
            numberValidation.enum &&
            numberValidation.enum.length > 0 &&
            typeof numberValidation.enum[0] === "number"
        )
            schema.enum = numberValidation.enum;
        if (Object.keys(schema).length > 0) {
            const validateResult = jsonschema.validate(
                numberToValidate,
                schema,
            );
            if (validateResult.errors && validateResult.errors.length > 0) {
                return `'${numberToValidate}' ${validateResult.errors[0].message}`;
            }
        }
    }

    //StringArrayValidation
    {
        const stringArrayValidation: StringArrayValidation = validation as StringArrayValidation;
        const arrayToValidate = valueToValidate as string[];
        if (arrayToValidate instanceof Array) {
            const schema: any = {};
            if (stringArrayValidation.maxItems)
                schema.maxItems = stringArrayValidation.maxItems;
            if (stringArrayValidation.minItems)
                schema.minItems = stringArrayValidation.minItems;
            if (stringArrayValidation.uniqueItems)
                schema.uniqueItems = stringArrayValidation.uniqueItems;
            if (Object.keys(schema).length > 0) {
                const validateResult = jsonschema.validate(
                    arrayToValidate,
                    schema,
                );
                if (validateResult.errors && validateResult.errors.length > 0) {
                    return `'${arrayToValidate}' ${validateResult.errors[0].message}`;
                }
            }
            if (
                stringArrayValidation.equals &&
                stringArrayValidation.equals instanceof Array
            ) {
                stringArrayValidation.enum = stringArrayValidation.equals;
                stringArrayValidation.containsAll =
                    stringArrayValidation.equals;
            }
            if (stringArrayValidation.enum) {
                for (const item of arrayToValidate) {
                    if (!stringArrayValidation.enum.includes(item)) {
                        return `'${arrayToValidate}' does not meet enum:'${stringArrayValidation.enum}'`;
                    }
                }
            }
            if (stringArrayValidation.contains) {
                if (!arrayToValidate.includes(stringArrayValidation.contains)) {
                    return `'${arrayToValidate}' does not meet contains:'${stringArrayValidation.contains}'`;
                }
            }
            if (stringArrayValidation.containsAll) {
                const containsAll: string[] = stringArrayValidation.containsAll;
                if (containsAll.length > 0) {
                    for (const i of containsAll) {
                        if (!arrayToValidate.includes(i)) {
                            return `'${arrayToValidate}' does not meet containsAll:'${containsAll}'`;
                        }
                    }
                }
            }
            if (stringArrayValidation.containsAny) {
                const containsAny: string[] = stringArrayValidation.containsAny;
                if (containsAny.length > 0) {
                    // let array = valueToValidate as string[];
                    let found = false;
                    for (const i of containsAny) {
                        if (arrayToValidate.includes(i)) {
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        return `'${arrayToValidate}' does not meet containsAny:'${containsAny}'`;
                    }
                }
            }
        }
    }
    return undefined;
}
