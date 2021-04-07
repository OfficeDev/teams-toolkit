// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, SystemError, UserError, Result, ok } from "fx-api";
import { Plugins } from "./constants";

export type AadResult = Result<any, FxError>;

export class ResultFactory {
  static readonly source: string = Plugins.pluginNameShort;

  public static UserError(
    name: string,
    message: string,
    innerError?: any,
    stack?: string,
    helpLink?: string
  ): UserError {
    return new UserError(
      name,
      message,
      this.source,
      stack,
      helpLink,
      innerError
    );
  }

  public static SystemError(
    name: string,
    message: string,
    innerError?: any,
    stack?: string,
    issueLink?: string
  ): SystemError {
    return new SystemError(
      name,
      message,
      this.source,
      stack,
      issueLink,
      innerError
    );
  }

  public static Success(result?: any): AadResult {
    return ok(result);
  }
}
