// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Inputs,
  MultiSelectQuestion,
  OptionItem,
  Question,
  SingleSelectQuestion,
  StaticOptions,
  ValidationSchema,
  getValidationFunction,
} from "@microsoft/teamsfx-api";
import { EmptyOptionError } from "../error/common";

class ValidationUtils {
  async validateInputForSingleSelectQuestion(
    question: SingleSelectQuestion,
    value: string | OptionItem,
    inputs: Inputs
  ): Promise<string | undefined> {
    let options = question.staticOptions;
    if (question.dynamicOptions) {
      options = await question.dynamicOptions(inputs);
    }
    return this.isAllowedValue(question.name, value, options, question.returnObject);
  }

  async validateInputForMultipleSelectQuestion(
    question: MultiSelectQuestion,
    value: string[] | OptionItem[],
    inputs: Inputs
  ): Promise<string | undefined> {
    let options = question.staticOptions;
    if (question.dynamicOptions) {
      options = await question.dynamicOptions(inputs);
    }
    for (const item of value) {
      const error = this.isAllowedValue(question.name, item, options, question.returnObject);
      if (error) return error;
    }
    return undefined;
  }
  formatInvalidInputError(key: string, value: string | OptionItem, options: StaticOptions): string {
    return `Invalid input '${key}':${JSON.stringify(value)}, allowed value: ${JSON.stringify(
      options
    )}`;
  }
  formatInvalidOptionsError(options: StaticOptions): string {
    return `Invalid question, expect input object, but allowed value: ${JSON.stringify(options)}`;
  }
  isAllowedValue(
    key: string,
    value: string | OptionItem,
    options: StaticOptions,
    returnObject?: boolean
  ): string | undefined {
    if (options.length === 0) {
      return new EmptyOptionError(key, "validationUtils").message;
    }
    const optionIsStringArray = typeof options[0] === "string";
    if (returnObject) {
      if (optionIsStringArray) {
        return this.formatInvalidOptionsError(options);
      }
      if (!value || typeof value === "string") {
        return this.formatInvalidInputError(key, value, options);
      }
      if (!(options as OptionItem[]).find((item) => item.id === value.id)) {
        return this.formatInvalidInputError(key, value, options);
      }
    } else {
      if (!value || typeof value !== "string") {
        return this.formatInvalidInputError(key, value, options);
      }
      // value is string here
      const foundOption = optionIsStringArray
        ? (options as string[]).find((item: string) => item === value)
        : (options as OptionItem[]).find((item: OptionItem) => item.id === value);
      if (!foundOption) {
        return this.formatInvalidInputError(key, value, options);
      }
    }
  }

  /**
   * validate value against question model definition
   */
  async validateInputs(
    question: Question,
    value: string | string[] | OptionItem | OptionItem[],
    inputs: Inputs
  ): Promise<string | undefined> {
    if (question.type === "singleSelect") {
      if (question.skipValidation) return undefined;
      return await this.validateInputForSingleSelectQuestion(
        question,
        value as string | OptionItem,
        inputs
      );
    } else if (question.type === "multiSelect") {
      if (question.skipValidation) return undefined;
      return await this.validateInputForMultipleSelectQuestion(
        question,
        value as string[] | OptionItem[],
        inputs
      );
    } else {
      if (question.validation) {
        const vFunc = getValidationFunction<string | string[]>(question.validation, inputs);
        const res = await vFunc(value as string | string[]);
        if (res) return res;
      }
      if (question.type === "text" && question.additionalValidationOnAccept) {
        const vFunc = getValidationFunction<string | string[]>(
          question.additionalValidationOnAccept,
          inputs
        );
        const res = await vFunc(value as string | string[]);
        if (res) return res;
      }
      return undefined;
    }
  }
}

export const validationUtils = new ValidationUtils();
