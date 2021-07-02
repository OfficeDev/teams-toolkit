import {ErrorType, BaseError} from './base-error'
import {ErrorNames, Suggestions} from './constant'

export class InputsError extends BaseError {
  constructor(details: string) {
    super(
      ErrorType.User,
      ErrorNames.InputsError,
      `Inputs are missing or invalid. Details: ${details}`,
      [Suggestions.CheckInputsAndUpdate]
    )
  }
}

export class EnvironmentVariableError extends BaseError {
  constructor(details: string) {
    super(
      ErrorType.User,
      ErrorNames.InputsError,
      `Inputs are missing or invalid. Details: ${details}`,
      [Suggestions.CheckInputsAndUpdate]
    )
  }
}

export class LanguageError extends BaseError {
  constructor(details: string) {
    super(
      ErrorType.User,
      ErrorNames.LanguageError,
      `programmingLanguage is missing or invalid. Details: ${details}`,
      [Suggestions.CheckEnvDefaultJson]
    )
  }
}
