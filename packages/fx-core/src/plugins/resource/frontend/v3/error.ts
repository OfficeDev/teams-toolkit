// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureAccountProvider,
  err,
  FxError,
  Inputs,
  ok,
  OptionItem,
  QTreeNode,
  Result,
  TokenProvider,
  UserError,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";

export class UnauthenticatedError extends UserError {
  constructor() {
    super(ErrorType.User, "UnauthenticatedError", "Failed to get user login information.", [
      tips.doLogin,
    ]);
  }
}
