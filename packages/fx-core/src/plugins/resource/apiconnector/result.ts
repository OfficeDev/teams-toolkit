// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import { FxError, SystemError, UserError, Result, ok, QTreeNode } from "@microsoft/teamsfx-api";
import { Constants } from "./constants";
export type FxResult = Result<any, FxError>;
export type ApiConnectorResult = Record<string, any>;
export type QuestionResult = Result<QTreeNode | undefined, FxError>;
export interface ApiConnectionMsg {
  defaultMsg: string;
  localizedMsg: string;
}

export enum FileChangeType {
  Create = "Create",
  Update = "Update",
}

export interface FileChange {
  changeType: FileChangeType;
  filePath: string;
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

  public static Success(result?: any): FxResult {
    return ok(result);
  }
}
