// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { SystemError, UserError } from "@microsoft/teamsfx-api";
import { Constants } from "./constants";

export class AppStudioResultFactory {
  static readonly defaultHelpLink = "";
  static readonly defaultIssueLink = "";

  public static UserError(
    name: string,
    messages: [string, string],
    helpLink?: string,
    stack?: string,
    innerError?: any
  ): UserError {
    return new UserError({
      name,
      message: messages[0],
      displayMessage: messages[1],
      source: Constants.PLUGIN_NAME,
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
      source: Constants.PLUGIN_NAME,
      issueLink,
      error: innerError,
    });
  }
}
