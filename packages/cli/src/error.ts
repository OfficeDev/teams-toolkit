// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CLICommandOption, UserError } from "@microsoft/teamsfx-api";
import * as constants from "./constants";
import { strings } from "./resource";
import * as util from "util";
import { helper } from "./commands/helper";

export class MissingRequiredOptionError extends UserError {
  constructor(command: string, option: string | CLICommandOption) {
    super({
      source: constants.cliSource,
      message: util.format(
        strings["error.MissingRequiredArgumentError"],
        command,
        typeof option === "string" ? option : option.name,
        typeof option === "string" ? option : helper.formatOptionName(option, false)
      ),
    });
  }
}
export class MissingRequiredArgumentError extends UserError {
  constructor(command: string, argument: string | CLICommandOption) {
    super({
      source: constants.cliSource,
      message: util.format(
        strings["error.MissingRequiredArgumentError"],
        command,
        typeof argument === "string" ? argument : argument.name
      ),
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
