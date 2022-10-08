// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FxError, Result, SystemError, UserError, err, ok } from "@microsoft/teamsfx-api";

import { Links, Alias } from "./constants";

export type FxResult = Result<any, FxError>;

export class FxBotPluginResultFactory {
  static readonly source: string = Alias.TEAMS_BOT_PLUGIN;
  static readonly defaultHelpLink: string = Links.HELP_LINK;
  static readonly defaultIssueLink: string = Links.ISSUE_LINK;

  public static UserError(
    errorName: string,
    errorMessage: [string, string],
    innerError?: any,
    helpLink?: string
  ): FxResult {
    return err(
      new UserError({
        name: errorName,
        message: errorMessage[0],
        displayMessage: errorMessage[1],
        source: FxBotPluginResultFactory.source,
        error: innerError,
        helpLink: helpLink ?? this.defaultHelpLink,
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
        source: FxBotPluginResultFactory.source,
        error: innerError,
        issueLink: FxBotPluginResultFactory.defaultIssueLink,
      })
    );
  }
}
