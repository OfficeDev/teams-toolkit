// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FxError, Result, SystemError, UserError, err, ok } from "@microsoft/teamsfx-api";

import { CommonConstants, DefaultValues, FunctionPluginInfo } from "./constants";

export type FxResult = Result<any, FxError>;

class FxResultFactory {
  static readonly source: string = CommonConstants.emptyString;
  static readonly defaultHelpLink = CommonConstants.emptyString;
  static readonly defaultIssueLink = CommonConstants.emptyString;

  public static UserError(
    errorMessage: [string, string],
    name: string,
    helpLink?: string,
    innerError?: any,
    stack?: string
  ): FxResult {
    return err(
      new UserError({
        name: name,
        message: errorMessage[0],
        displayMessage: errorMessage[1],
        source: this.source,
        helpLink: helpLink ?? this.defaultHelpLink,
        error: innerError,
      })
    );
  }

  public static SystemError(
    errorMessage: [string, string],
    name: string,
    issueLink?: string,
    innerError?: any,
    stack?: string
  ): FxResult {
    return err(
      new SystemError({
        name: name,
        message: errorMessage[0],
        displayMessage: errorMessage[1],
        source: this.source,
        issueLink: issueLink ?? this.defaultIssueLink,
        error: innerError,
      })
    );
  }

  public static Success<T>(result?: T): FxResult {
    return ok(result);
  }
}

export class FunctionPluginResultFactory extends FxResultFactory {
  static readonly source: string = FunctionPluginInfo.alias;
  static readonly defaultHelpLink = DefaultValues.helpLink;
  static readonly defaultIssueLink = DefaultValues.issueLink;
}
