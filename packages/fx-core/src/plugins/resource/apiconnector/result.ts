// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import { FxError, SystemError, UserError, Result, ok, QTreeNode } from "@microsoft/teamsfx-api";
import { Constants } from "./constants";
export type ApiConnectorResult = Result<any, FxError>;
export type QesutionResult = Result<QTreeNode | undefined, FxError>;
export class ResultFactory {
  static readonly source: string = Constants.pluginNameShort;
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

  public static Success(result?: any): ApiConnectorResult {
    return ok(result);
  }
}
