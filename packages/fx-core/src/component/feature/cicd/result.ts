// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FxError, Result, SystemError, UserError, err, ok } from "@microsoft/teamsfx-api";

import { Alias } from "./constants";

export type FxResult = Result<any, FxError>;

export class FxCICDPluginResultFactory {
  static readonly source: string = Alias.TEAMS_CICD_PLUGIN;
  static readonly defaultHelpLink: string = "";
  static readonly defaultIssueLink: string = "";

  public static UserError(
    errorName: string,
    errorMessage: [string, string],
    showHelpLink: boolean,
    innerError?: any
  ): FxResult {
    return err(
      new UserError({
        name: errorName,
        message: errorMessage[0],
        displayMessage: errorMessage[1],
        source: FxCICDPluginResultFactory.source,
        helpLink: showHelpLink ? FxCICDPluginResultFactory.defaultHelpLink : undefined,
        error: innerError,
      })
    );
  }

  public static SystemError(
    errorName: string,
    errorMessage: [string, string],
    innerError?: any
  ): FxResult {
    return err(
      new SystemError({
        name: errorName,
        message: errorMessage[0],
        displayMessage: errorMessage[1],
        source: FxCICDPluginResultFactory.source,
        issueLink: FxCICDPluginResultFactory.defaultIssueLink,
        error: innerError,
      })
    );
  }

  public static Success(result?: any): FxResult {
    return ok(result);
  }
}
