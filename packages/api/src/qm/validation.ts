// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as jsonschema from "jsonschema";
import { Inputs, OptionItem } from "../types";

export type ValidateFunc<T> = (
  input: T,
  inputs?: Inputs
) => string | undefined | Promise<string | undefined>;

/**
 * Validation for Any Instance Type
 * JSON Schema Validation reference: http://json-schema.org/draft/2019-09/json-schema-validation.html
 */
export interface StaticValidation {
  /**
   * whether the value is required or not, default value is true if it is undefined
   */
  required?: boolean;
  /**
   * An instance validates successfully against this keyword if its value is equal to the value of the keyword.
   */
  equals?: unknown;
}

/**
 * Validation for Strings
 */
export interface StringValidation extends StaticValidation {
  /**
   * A string instance is valid against this keyword if its length is less than, or equal to, the value of this keyword.
   */
  maxLength?: number;
  /**
   * A string instance is valid against this keyword if its length is greater than, or equal to, the value of this keyword.
   */
  minLength?: number;
  /**
   * A string instance is considered valid if the regular expression matches the instance successfully.
   */
  pattern?: string;
  /**
   * A string instance validates successfully against this keyword if its value is equal to one of the elements in this keyword's array value.
   */
  enum?: string[]; // the value must be contained in this list
  /**
   * A string instance is valid against this keyword if the string starts with the value of this keyword.
   */
  startsWith?: string;
  /**
   * A string instance is valid against this keyword if the string ends with the value of this keyword.
   */
  endsWith?: string;
  /**
   * A string instance is valid against this keyword if the string contains the value of this keyword.
   */
  includes?: string;
  /**
   * An instance validates successfully against this keyword if its value is equal to the value of the keyword.
   */
  equals?: string;
  /**
   * An instance validates successfully against this keyword if its value is not equal to the value of the keyword.
   */
  notEquals?: string;

  /**
   * A string instance validates successfully against this keyword if its value does not equal to any of the elements in this keyword's array value.
   */
  excludesEnum?: string[];
}

/**
 * Validation for String Arrays
 */
export interface StringArrayValidation extends StaticValidation {
  /**
   * The value of this keyword MUST be a non-negative integer.
   * An array instance is valid against "maxItems" if its size is less than, or equal to, the value of this keyword.
   */
  maxItems?: number;
  /**
   * The value of this keyword MUST be a non-negative integer.
   * An array instance is valid against "minItems" if its size is greater than, or equal to, the value of this keyword.
   */
  minItems?: number;
  /**
   * If this keyword has boolean value false, the instance validates successfully. If it has boolean value true, the instance validates successfully if all of its elements are unique.
   */
  uniqueItems?: boolean;
  /**
   * An instance validates successfully against this string array if they have the exactly the same elements.
   */
  equals?: string[];
  /**
   * An array instance is valid against "enum" array if all of the elements of the array is contained in the `enum` array.
   */
  enum?: string[];

  /**
   * An array instance is valid against "excludes" if it doesn't contains the value of `excludes`
   */
  excludes?: string;

  /**
   * An array instance is valid against "contains" if it contains the value of `contains`
   */
  contains?: string;
  /**
   * An array instance is valid against "containsAll" array if it contains all of the elements of `containsAll` array.
   */
  containsAll?: string[];
  /**
   * An array instance is valid against "containsAny" array if it contains any one of the elements of `containsAny` array.
   */
  containsAny?: string[]; ///non-standard, the values must contains any one in the array
}

/**
 * The validation is checked by a validFunc provided by user
 */
export interface FuncValidation<
  T extends string | string[] | OptionItem | OptionItem[] | undefined
> {
  /**
   * A function that will be called to validate input and to give a hint to the user.
   *
   * @param input The current value of the input to be validated.
   * @return A human-readable string which is presented as diagnostic message.
   * Return `undefined` when 'value' is valid.
   */
  validFunc: ValidateFunc<T>;
}

export type ConditionFunc = (inputs: Inputs) => boolean | Promise<boolean>;

/**
 * Definition of validation schema, which is a union of `StringValidation`, `StringArrayValidation` and `FuncValidation<any>`
 */
export type ValidationSchema = StringValidation | StringArrayValidation | FuncValidation<any>;

/**
 * A function to return a validation function according the validation schema
 * @param validation validation schema
 * @param inputs object to carry all user inputs
 * @returns a validation function
 */
export function getValidationFunction<T extends string | string[] | undefined>(
  validation: ValidationSchema,
  inputs: Inputs
): (input: T) => string | undefined | Promise<string | undefined> {
  return function (input: T): string | undefined | Promise<string | undefined> {
    return validate(validation, input, inputs);
  };
}

/**
 * Implementation of validation function
 * @param validSchema validation schema
 * @param value value to validate
 * @param inputs user inputs object, which works as the context of the validation
 * @returns A human-readable string which is presented as diagnostic message.
 * Return `undefined` when 'value' is valid.
 */
export async function validate<T extends string | string[] | OptionItem | OptionItem[] | undefined>(
  validSchema: ValidationSchema | ConditionFunc,
  value: T,
  inputs?: Inputs
): Promise<string | undefined> {
  {
    //FuncValidation
    const funcValidation: FuncValidation<T> = validSchema as FuncValidation<T>;
    if (funcValidation.validFunc) {
      const res = await funcValidation.validFunc(value, inputs);
      return res as string;
    } else if (typeof funcValidation === "function") {
      const res = await (funcValidation as ConditionFunc)(inputs!);
      if (res) return undefined;
      return "condition function is not met.";
    }
  }

  if (!value) {
    if ((validSchema as StaticValidation).required === true) return `input value is required.`;
  }

  const noneEmptyKeyNum = Object.keys(validSchema).filter(
    (key) => (validSchema as any)[key] !== undefined
  ).length;

  if (noneEmptyKeyNum === 0) {
    return undefined;
  }

  if (
    value === undefined &&
    ((validSchema as any).required ||
      (validSchema as any).equals ||
      (validSchema as any).maxLength ||
      (validSchema as any).minLength ||
      (validSchema as any).pattern ||
      (validSchema as any).enum ||
      (validSchema as any).startsWith ||
      (validSchema as any).endsWith ||
      (validSchema as any).includes ||
      (validSchema as any).maxItems ||
      (validSchema as any).minItems ||
      (validSchema as any).uniqueItems ||
      (validSchema as any).contains ||
      (validSchema as any).containsAll ||
      (validSchema as any).containsAny)
  ) {
    return `'undefined' does not meet condition:'${JSON.stringify(validSchema)}'`;
  }

  {
    // StringValidation
    const stringValidation: StringValidation = validSchema as StringValidation;
    const strToValidate = value as string;
    if (strToValidate === undefined || typeof strToValidate === "string") {
      const schema: any = {};
      if (stringValidation.equals && typeof stringValidation.equals === "string") {
        if (strToValidate === undefined) {
          return `'${strToValidate}' does not meet equals:'${stringValidation.equals}'`;
        }
        schema.const = stringValidation.equals;
      }
      if (
        stringValidation.enum &&
        stringValidation.enum.length > 0 &&
        typeof stringValidation.enum[0] === "string"
      )
        schema.enum = stringValidation.enum;
      if (stringValidation.minLength) schema.minLength = stringValidation.minLength;
      if (stringValidation.maxLength) schema.maxLength = stringValidation.maxLength;
      if (stringValidation.pattern) schema.pattern = stringValidation.pattern;
      if (Object.keys(schema).length > 0) {
        const validateResult = jsonschema.validate(strToValidate, schema);
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
      if (stringValidation.includes) {
        if (!strToValidate.includes(stringValidation.includes)) {
          return `'${strToValidate}' does not meet includes:'${stringValidation.includes}'`;
        }
      }
      if (stringValidation.notEquals) {
        if (strToValidate === stringValidation.notEquals) {
          return `'${strToValidate}' does not meet notEquals:'${stringValidation.notEquals}'`;
        }
      }
      if (stringValidation.excludesEnum) {
        if (stringValidation.excludesEnum.includes(strToValidate)) {
          return `'${strToValidate}' does not meet excludesEnum:'${stringValidation.excludesEnum}'`;
        }
      }
    }
  }

  //StringArrayValidation
  {
    const stringArrayValidation: StringArrayValidation = validSchema as StringArrayValidation;
    const arrayToValidate = value as string[];
    if (arrayToValidate === undefined || arrayToValidate instanceof Array) {
      const schema: any = {};
      if (stringArrayValidation.maxItems) schema.maxItems = stringArrayValidation.maxItems;
      if (stringArrayValidation.minItems) schema.minItems = stringArrayValidation.minItems;
      if (stringArrayValidation.uniqueItems) schema.uniqueItems = stringArrayValidation.uniqueItems;
      if (Object.keys(schema).length > 0) {
        const validateResult = jsonschema.validate(arrayToValidate, schema);
        if (validateResult.errors && validateResult.errors.length > 0) {
          return `'${arrayToValidate}' ${validateResult.errors[0].message}`;
        }
      }
      if (stringArrayValidation.equals) {
        if (stringArrayValidation.equals instanceof Array) {
          stringArrayValidation.enum = stringArrayValidation.equals;
          stringArrayValidation.containsAll = stringArrayValidation.equals;
        } else {
          return `'${arrayToValidate}' does not equals to:'${stringArrayValidation.equals}'`;
        }
      }
      if (stringArrayValidation.enum && arrayToValidate) {
        for (const item of arrayToValidate) {
          if (!stringArrayValidation.enum.includes(item)) {
            return `'${arrayToValidate}' does not meet with enum:'${stringArrayValidation.enum}'`;
          }
        }
      }
      if (stringArrayValidation.excludes) {
        if (arrayToValidate && arrayToValidate.includes(stringArrayValidation.excludes)) {
          return `'${arrayToValidate}' does not meet with excludes:'${stringArrayValidation.excludes}'`;
        }
      }
      if (stringArrayValidation.contains) {
        if (arrayToValidate && !arrayToValidate.includes(stringArrayValidation.contains)) {
          return `'${arrayToValidate}' does not meet with contains:'${stringArrayValidation.contains}'`;
        }
      }
      if (stringArrayValidation.containsAll) {
        const containsAll: string[] = stringArrayValidation.containsAll;
        if (containsAll.length > 0) {
          for (const i of containsAll) {
            if (arrayToValidate && !arrayToValidate.includes(i)) {
              return `'${arrayToValidate}' does not meet with containsAll:'${containsAll}'`;
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
            if (arrayToValidate && arrayToValidate.includes(i)) {
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
