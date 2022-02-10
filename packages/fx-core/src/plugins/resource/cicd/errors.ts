// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ErrorNames, Suggestions } from "./constants";

export enum ErrorType {
  User,
  System,
}

export class PluginError extends Error {
  public name: string;
  public details: string;
  public suggestions: string[];
  public errorType: ErrorType;
  public innerError?: Error;
  public showHelpLink: boolean;

  constructor(
    type: ErrorType,
    name: string,
    details: string,
    suggestions: string[],
    innerError?: Error,
    showHelpLink = false
  ) {
    super(details);
    this.name = name;
    this.details = details;
    this.suggestions = suggestions;
    this.errorType = type;
    this.innerError = innerError;
    this.showHelpLink = showHelpLink;
    Object.setPrototypeOf(this, PluginError.prototype);
  }

  genMessage(): string {
    return `${this.message} Suggestions: ${this.suggestions.join("\n")}`;
  }
}

export class InternalError extends PluginError {
  constructor(details: string, innerError?: Error) {
    super(
      ErrorType.System,
      ErrorNames.INTERNAL_ERROR,
      details,
      [Suggestions.RETRY_THE_CURRENT_STEP],
      innerError
    );
  }
}
