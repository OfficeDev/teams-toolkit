// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {ErrorType, BaseError} from './baseError'
import {ErrorNames, Suggestions} from './constant'

export class InternalError extends BaseError {
  constructor(message: string) {
    super(ErrorType.System, ErrorNames.InternalError, message, [
      Suggestions.RerunWorkflow,
      Suggestions.CreateAnIssue
    ])
  }
}
