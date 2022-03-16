// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import { FxError, SystemError, UserError, Result, ok } from "@microsoft/teamsfx-api";
import { Constants } from "./constants";
export type ApiConnectorResult = Result<any, FxError>;
export class ResultFactory {
  static readonly source: string = Constants.pluginNameShort;
  public static UserError(
    name: string,
    message: string,
    innerError?: any,
    stack?: string,
    helpLink?: string
  ): UserError {
    return new UserError(name, message, this.source, stack, helpLink, innerError);
  }

  public static SystemError(
    name: string,
    message: string,
    innerError?: any,
    stack?: string,
    issueLink?: string
  ): SystemError {
    return new SystemError(name, message, this.source, stack, issueLink, innerError);
  }

  public static Success(result?: any): ApiConnectorResult {
    return ok(result);
  }
}
