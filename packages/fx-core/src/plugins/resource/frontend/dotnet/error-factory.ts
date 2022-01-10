// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FxError, Result, SystemError, UserError } from "@microsoft/teamsfx-api";

import { DotnetPluginInfo as PluginInfo } from "./constants";

export type TeamsFxResult = Result<any, FxError>;

export class ErrorFactory {
  static readonly source: string = PluginInfo.alias;
  static readonly issueLink: string = PluginInfo.issueLink;
  static readonly helpLink: string = PluginInfo.helpLink;

  public static UserError(
    name: string,
    message: string,
    innerError?: any,
    stack?: string,
    helpLink?: string
  ): FxError {
    return new UserError(name, message, this.source, stack, helpLink, innerError);
  }

  public static SystemError(
    name: string,
    message: string,
    innerError?: any,
    stack?: string,
    issueLink = this.issueLink
  ): FxError {
    return new SystemError(name, message, this.source, stack, issueLink, innerError);
  }
}
