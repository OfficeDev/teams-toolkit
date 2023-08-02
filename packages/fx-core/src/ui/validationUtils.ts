// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Inputs,
  MultiSelectQuestion,
  OptionItem,
  Question,
  SingleSelectQuestion,
  StaticOptions,
  getValidationFunction,
} from "@microsoft/teamsfx-api";
import { EmptyOptionError } from "../error/common";

class ValidationUtils {
  async validateInputForSingleSelectQuestion(
    question: SingleSelectQuestion,
    inputs: Inputs
  ): Promise<string | undefined> {
    const value = inputs[question.name] as string | OptionItem;
    let options = question.staticOptions;
    if (question.dynamicOptions) {
      options = await question.dynamicOptions(inputs);
    }
    return this.isAllowedValue(question.name, value, options, question.returnObject);
  }

  async validateInputForMultipleSelectQuestion(
    question: MultiSelectQuestion,
    inputs: Inputs
  ): Promise<string | undefined> {
    const value = inputs[question.name] as string[] | OptionItem[];
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
      return new EmptyOptionError(key).message;
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

  async validateManualInputs(question: Question, inputs: Inputs): Promise<string | undefined> {
    if (question.type === "singleSelect") {
      return await this.validateInputForSingleSelectQuestion(question, inputs);
    } else if (question.type === "multiSelect") {
      return await this.validateInputForMultipleSelectQuestion(question, inputs);
    } else {
      const validationFunc = (question as any).validation
        ? getValidationFunction<string | string[]>((question as any).validation, inputs)
        : undefined;
      if (validationFunc) {
        return await validationFunc(inputs[question.name]);
      }
    }
    return undefined;
  }
}

export const validationUtils = new ValidationUtils();
