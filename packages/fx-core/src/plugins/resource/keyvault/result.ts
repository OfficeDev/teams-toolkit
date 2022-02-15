// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FxError, ok, Result, SystemError, UserError } from "@microsoft/teamsfx-api";

import { Constants } from "./constants";

export type TeamsFxResult = Result<any, FxError>;

export class ResultFactory {
  static readonly source: string = Constants.KeyVaultPlugin.shortName;

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

  public static Success(result?: any): TeamsFxResult {
    return ok(result);
  }
}
