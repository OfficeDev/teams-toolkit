// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

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
