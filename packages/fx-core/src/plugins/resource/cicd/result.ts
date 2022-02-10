/**
 * This file is used to wrap result type of fx-api for function plugin because of its instability.
 */

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
    errorMessage: string,
    showHelpLink: boolean,
    innerError?: any
  ): FxResult {
    return err(
      new UserError(
        errorName,
        errorMessage,
        FxCICDPluginResultFactory.source,
        innerError?.stack,
        showHelpLink ? FxCICDPluginResultFactory.defaultHelpLink : undefined,
        innerError
      )
    );
  }

  public static SystemError(errorName: string, errorMessage: string, innerError?: any): FxResult {
    return err(
      new SystemError(
        errorName,
        errorMessage,
        FxCICDPluginResultFactory.source,
        innerError?.stack,
        FxCICDPluginResultFactory.defaultIssueLink,
        innerError
      )
    );
  }

  public static Success(result?: any): FxResult {
    return ok(result);
  }
}
