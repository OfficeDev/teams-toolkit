// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { SystemError, UserError } from "@microsoft/teamsfx-api";
import * as constants from "./constants";

export function NotValidInputValue(inputName: string, msg: string): UserError {
  return new UserError(constants.cliSource, "NotValidInputValue", `${inputName} - ${msg}`);
}

export function ReadFileError(e: Error): SystemError | UserError {
  if (e.message.includes("Unexpected end of JSON input")) {
    return new UserError(
      constants.cliSource,
      "ReadFileError",
      `${e.message}. Please check the format of it.`
    );
  }
  return new SystemError({ error: e, source: constants.cliSource, name: "ReadFileError" });
}

export function WriteFileError(e: Error): SystemError {
  return new SystemError({ error: e, source: constants.cliSource, name: "WriteFileError" });
}

export function EmptySubConfigOptions(): SystemError {
  return new UserError(
    constants.cliSource,
    "EmptySubConfigOptions",
    "Your Azure account has no active subscriptions. Please switch an Azure account."
  );
}

export class EnvNotSpecified extends UserError {
  constructor() {
    super(constants.cliSource, new.target.name, `The --env argument is not specified`);
  }
}
