// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ErrorNames, Suggestions } from "./constants";

export enum ErrorType {
  User,
  System,
}

export class PluginError extends Error {
  public name: string;
  public details: [string, string];
  public suggestions: string[];
  public errorType: ErrorType;
  public innerError?: Error;
  public showHelpLink: boolean;

  constructor(
    type: ErrorType,
    name: string,
    details: [string, string],
    suggestions: string[],
    innerError?: Error,
    showHelpLink = false
  ) {
    super(details[0]);
    this.name = name;
    this.details = details;
    this.suggestions = suggestions;
    this.errorType = type;
    this.innerError = innerError;
    this.showHelpLink = showHelpLink;
    Object.setPrototypeOf(this, PluginError.prototype);
  }

  genMessage(): string {
    return `${this.details[1]} Suggestions: ${this.suggestions.join("\n")}`;
  }
  genDefaultMessage(): string {
    return `${this.details[0]} Suggestions: ${this.suggestions.join("\n")}`;
  }
}

export class InternalError extends PluginError {
  constructor(details: [string, string], innerError?: Error) {
    super(
      ErrorType.System,
      ErrorNames.INTERNAL_ERROR,
      details,
      [Suggestions.RETRY_THE_CURRENT_STEP()],
      innerError
    );
  }
}

export class NoProjectOpenedError extends PluginError {
  constructor() {
    super(
      ErrorType.User,
      ErrorNames.NO_PROJECT_OPENED_ERROR,
      ["No project opened.", "No project opened."],
      [Suggestions.CREATE_PROJECT_OR_OPEN_EXISTING()]
    );
  }
}

export class FileSystemError extends PluginError {
  constructor(details: [string, string], innerError?: Error) {
    super(
      ErrorType.User,
      ErrorNames.FILE_SYSTEM_ERROR,
      details,
      [Suggestions.CHECK_PERMISSION(), Suggestions.RETRY_THE_CURRENT_STEP()],
      innerError
    );
  }
}
