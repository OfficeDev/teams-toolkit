// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import { FxError, SystemError, UserError, Result, ok, QTreeNode } from "@microsoft/teamsfx-api";
import { Constants } from "./constants";
export type ApiConnectorResult = Result<any, FxError>;
export type QesutionResult = Result<QTreeNode | undefined, FxError>;
export interface ApiConnectionMsg {
  defaultMsg: string;
  localizedMsg: string;
}
export class ResultFactory {
  static readonly source: string = Constants.pluginNameShort;
  public static UserError(
    name: string,
    messages: ApiConnectionMsg,
    innerError?: any,
    stack?: string,
    helpLink?: string
  ): UserError {
    return new UserError({
      name,
      message: messages.defaultMsg,
      displayMessage: messages.localizedMsg,
      source: this.source,
      helpLink,
      error: innerError,
    });
  }

  public static SystemError(
    name: string,
    messages: ApiConnectionMsg,
    innerError?: any,
    stack?: string,
    issueLink?: string
  ): SystemError {
    return new SystemError({
      name,
      message: messages.defaultMsg,
      displayMessage: messages.localizedMsg,
      source: this.source,
      issueLink,
      error: innerError,
    });
  }

  public static Success(result?: any): ApiConnectorResult {
    return ok(result);
  }
}
