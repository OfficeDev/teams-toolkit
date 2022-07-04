// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";
import { Messages } from "./messages";

export class PreconditionError extends UserError {
  constructor(source: string, messages: [string, string], suggestions: string[]) {
    super(
      source,
      new.target.name,
      `${messages[0]}. Suggestions: ${suggestions.join(" ")}`,
      `${messages[1]}. Suggestions: ${suggestions.join(" ")}`
    );
  }
}

export class TemplateZipFallbackError extends UserError {
  constructor(source: string) {
    super(
      source,
      new.target.name,
      `Failed to download zip package and open local zip package. Suggestions: ${[
        Messages.CheckOutputLogAndTryToFix,
        Messages.RetryTheCurrentStep,
      ].join(" ")}`
    );
  }
}

export class UnzipError extends UserError {
  constructor(source: string, path?: string) {
    super(
      source,
      new.target.name,
      `Failed to unzip templates and write to disk. Suggestions: ${[
        Messages.CheckOutputLogAndTryToFix,
        Messages.ReopenWorkingDir(path),
        Messages.RetryTheCurrentStep,
      ].join(" ")}`
    );
  }
}

export function CheckThrowSomethingMissing<T>(
  source: string,
  name: string,
  value: T | undefined
): T {
  if (!value) {
    throw new PreconditionError(source, Messages.SomethingIsMissing(name), [
      Messages.RetryTheCurrentStep,
    ]);
  }
  return value;
}

export class PackDirectoryExistenceError extends UserError {
  constructor(source: string) {
    const msg0 = `${Messages.SomethingIsNotExisting("pack directory")[0]} Suggestions: ${[
      Messages.RecreateTheProject[0],
    ].join(" ")}`;
    const msg1 = `${Messages.SomethingIsNotExisting("pack directory")[1]} Suggestions: ${[
      Messages.RecreateTheProject[1],
    ].join(" ")}`;
    super(source, new.target.name, msg0, msg1);
  }
}
