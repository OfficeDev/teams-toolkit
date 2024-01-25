// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { ErrorType } from "./interfaces";

export class SpecParserError extends Error {
  public readonly errorType: ErrorType;

  constructor(message: string, errorType: ErrorType) {
    super(message);
    this.errorType = errorType;
  }
}
