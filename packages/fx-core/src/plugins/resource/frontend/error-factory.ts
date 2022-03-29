// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FxError, Result, SystemError, UserError } from "@microsoft/teamsfx-api";

import { FrontendPluginInfo } from "./constants";

export type TeamsFxResult = Result<any, FxError>;

export class ErrorFactory {
  static readonly source: string = FrontendPluginInfo.ShortName;
  static readonly issueLink: string = FrontendPluginInfo.IssueLink;
  static readonly helpLink: string = FrontendPluginInfo.HelpLink;

  public static UserError(
    name: string,
    message: [string, string],
    innerError?: any,
    stack?: string,
    helpLink?: string
  ): FxError {
    return new UserError({
      name,
      message: message[0],
      displayMessage: message[1],
      source: this.source,
      helpLink,
      error: innerError,
    });
  }

  public static SystemError(
    name: string,
    message: [string, string],
    innerError?: any,
    stack?: string,
    issueLink = this.issueLink
  ): FxError {
    return new SystemError({
      name,
      message: message[0],
      displayMessage: message[1],
      source: this.source,
      issueLink,
      error: innerError,
    });
  }
}
