// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FxError, ok, Result, SystemError, UserError } from "@microsoft/teamsfx-api";

import { Constants } from "./constants";

export type SimpleAuthResult = Result<any, FxError>;

export class ResultFactory {
  static readonly source: string = Constants.SimpleAuthPlugin.shortName;

  public static UserError(
    name: string,
    messages: [string, string],
    innerError?: any,
    stack?: string,
    helpLink?: string
  ): UserError {
    return new UserError({
      name,
      message: messages[0],
      displayMessage: messages[1],
      source: this.source,
      helpLink,
      error: innerError,
    });
  }

  public static SystemError(
    name: string,
    messages: [string, string],
    innerError?: any,
    stack?: string,
    issueLink?: string
  ): SystemError {
    return new SystemError({
      name,
      message: messages[0],
      displayMessage: messages[1],
      source: this.source,
      issueLink,
      error: innerError,
    });
  }

  public static Success(result?: any): SimpleAuthResult {
    return ok(result);
  }
}
