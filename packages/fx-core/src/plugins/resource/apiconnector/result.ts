// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import { FxError, SystemError, UserError, Result, ok, QTreeNode } from "@microsoft/teamsfx-api";
import { Constants } from "./constants";
export type ApiConnectorResult = Result<any, FxError>;
export type QuestionResult = Result<QTreeNode | undefined, FxError>;
export class ResultFactory {
  static readonly source: string = Constants.pluginNameShort;
  public static UserError(
    name: string,
    message: string,
    innerError?: any,
    stack?: string,
    helpLink?: string
  ): UserError {
    return new UserError(name, message, this.source, stack);
  }

  public static SystemError(
    name: string,
    message: string,
    innerError?: any,
    stack?: string,
    issueLink?: string
  ): SystemError {
    return new SystemError(name, message, this.source, stack);
  }

  public static Success(result?: any): ApiConnectorResult {
    return ok(result);
  }
}
