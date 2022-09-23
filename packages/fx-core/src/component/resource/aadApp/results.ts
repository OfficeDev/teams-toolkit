// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, SystemError, UserError, Result, ok } from "@microsoft/teamsfx-api";
import { Plugins } from "./constants";

export type AadResult = Result<any, FxError>;

export class ResultFactory {
  static readonly source: string = Plugins.pluginNameShort;

  public static UserError(
    name: string,
    messages: [string, string],
    innerError?: any,
    stack?: string,
    helpLink?: string
  ): UserError {
    return new UserError({
      name: name,
      message: messages[0],
      displayMessage: messages[1],
      source: this.source,
      helpLink: helpLink,
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
      name: name,
      message: messages[0],
      displayMessage: messages[1],
      source: this.source,
      issueLink: issueLink,
      error: innerError,
    });
  }

  public static Success(result?: any): AadResult {
    return ok(result);
  }
}
