// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";

export class UserCancelError extends UserError {
  constructor(message: string, displayMessage: string) {
    super({
      source: "UI",
      name: "UserCancelError",
      message: message,
      displayMessage: displayMessage,
      categories: ["internal"],
    });
  }
}

export class EmptyOptionsError extends UserError {
  constructor(message: string, displayMessage: string) {
    super({
      source: "UI",
      name: "EmptyOptionsError",
      message: message,
      displayMessage: displayMessage,
      categories: ["internal"],
    });
  }
}

export class InternalUIError extends UserError {
  constructor(message: string, displayMessage: string) {
    super({
      source: "UI",
      name: "InternalUIError",
      message: message,
      displayMessage: displayMessage,
      categories: ["internal"],
    });
  }
}

export class ScriptTimeoutError extends UserError {
  constructor(message: string, displayMessage: string) {
    super({
      source: "UI",
      name: "ScriptTimeoutError",
      message: message,
      displayMessage: displayMessage,
      categories: ["external"],
    });
  }
}
