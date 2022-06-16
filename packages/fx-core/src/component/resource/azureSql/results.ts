// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, SystemError, UserError, Result } from "@microsoft/teamsfx-api";
import { Constants } from "./constants";

export type SqlResult = Result<any, FxError>;

export class SqlResultFactory {
  static readonly source: string = Constants.pluginNameShort;
  static readonly defaultHelpLink = "";
  static readonly defaultIssueLink = "";

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
}
