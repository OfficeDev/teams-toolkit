// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as jsonschema from "jsonschema";  
import { Inputs } from "../types";
  


/**
 * Validation for Any Instance Type
 * JSON Schema Validation reference: http://json-schema.org/draft/2019-09/json-schema-validation.html
 */
 export interface StaticValidation {
  required?: boolean; // default value is true
  equals?: unknown;
}

/**
* //Validation for Strings
*/
export interface StringValidation extends StaticValidation {
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  enum?: string[]; // the value must be contained in this list
  startsWith?: string; //non-standard
  endsWith?: string; //non-standard
  includes?: string; //non-standard
  equals?: string; //non-standard
}

/**
* Validation for String Arrays
*/
export interface StringArrayValidation extends StaticValidation {
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  equals?: string[]; //non-standard
  enum?: string[]; // non-standard all the values must be contained in this list
  contains?: string; ////non-standard
  containsAll?: string[]; ///non-standard, the values must contains all items in the array
  containsAny?: string[]; ///non-standard, the values must contains any one in the array
}

/**
* The validation is checked by a validFunc provided by user
*/
export interface FuncValidation {
  validFunc?: (input: string|string[]|undefined, previousInputs?: Inputs) => string | undefined | Promise<string | undefined>;
}

export type ValidationSchema =
  | StringValidation
  | StringArrayValidation
  | FuncValidation;


export function getValidationFunction(
  validation: ValidationSchema,
  inputs: Inputs
): (input: string | string[] | undefined)  => Promise<string | undefined> {
  return async function(input: string | string[] | undefined): Promise<string | undefined> {
    return await validate(validation, input, inputs);
  };
}

export async function validate(
  validSchema: ValidationSchema,
  value: string | string[] | undefined,
  inputs?: Inputs
): Promise<string | undefined> {
  {
    //FuncValidation
    const funcValidation: FuncValidation = validSchema as FuncValidation;
    if (funcValidation.validFunc) {
      const res = await funcValidation.validFunc(value, inputs);
      return res as string;
    }
  }
  
  if(!value){
    if((validSchema as StaticValidation).required === true)
      return `input value is required.`;
  }

  {
    // StringValidation
    const stringValidation: StringValidation = validSchema as StringValidation;
    const strToValidate = value as string;
    if (typeof strToValidate === "string") {
      const schema: any = {};
      if (stringValidation.equals && typeof stringValidation.equals === "string")
        schema.const = stringValidation.equals;
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
      if (stringValidation.includes && typeof strToValidate === "string") {
        if (!strToValidate.includes(stringValidation.includes)) {
          return `'${strToValidate}' does not meet includes:'${stringValidation.includes}'`;
        }
      }
    }
  }

  //StringArrayValidation
  {
    const stringArrayValidation: StringArrayValidation = validSchema as StringArrayValidation;
    const arrayToValidate = value as string[];
    if (arrayToValidate instanceof Array) {
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
      if (stringArrayValidation.equals && stringArrayValidation.equals instanceof Array) {
        stringArrayValidation.enum = stringArrayValidation.equals;
        stringArrayValidation.containsAll = stringArrayValidation.equals;
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
