// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";
import * as constants from "./constants";
import { strings } from "./resource";
import * as util from "util";

export class MissingRequiredArgumentError extends UserError {
  constructor(command: string, name: string) {
    super({
      source: constants.cliSource,
      message: util.format(strings["error.MissingRequiredArgumentError"], command, name),
    });
  }
}

export class ArgumentConflictError extends UserError {
  constructor(command: string, name1: string, name2: string) {
    super({
      source: constants.cliSource,
      message: util.format(strings["error.ArgumentConflictError"], command, name1, name2),
    });
  }
}

export class UnknownOptionError extends UserError {
  constructor(command: string, name: string) {
    super({
      source: constants.cliSource,
      message: util.format(strings["error.UnknownOptionError"], command, name),
    });
  }
}
