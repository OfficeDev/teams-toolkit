// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";
import { concatErrorMessageWithSuggestions, ErrorMessage, getLocalizedMessage } from "../messages";

export class CommandExecutionError extends UserError {
  constructor(source: string, cmd: string, path: string, innerError?: unknown) {
    const suggestions = [
      ErrorMessage.RunFailedCommand(cmd, path),
      ErrorMessage.CheckCommandOutputAndTryToFixIt,
      ErrorMessage.RetryTheCurrentStep,
    ];
    const { default: defaultMsg, localized } = concatErrorMessageWithSuggestions(
      getLocalizedMessage("plugins.bot.FailToRun", cmd),
      suggestions
    );
    super(source, new.target.name, defaultMsg, localized);
    this.innerError = innerError;
  }
}

export class TemplateZipFallbackError extends UserError {
  constructor(source: string) {
    const suggestions = [ErrorMessage.CheckOutputLogAndTryToFix, ErrorMessage.RetryTheCurrentStep];
    const { default: defaultMsg, localized } = concatErrorMessageWithSuggestions(
      getLocalizedMessage("plugins.bot.TemplateZipFallbackError"),
      suggestions
    );
    super(source, new.target.name, defaultMsg, localized);
  }
}

export class UnzipError extends UserError {
  constructor(source: string, path?: string) {
    const suggestions = [
      ErrorMessage.CheckOutputLogAndTryToFix,
      ErrorMessage.ReopenWorkingDir(path),
      ErrorMessage.RetryTheCurrentStep,
    ];
    const { default: defaultMsg, localized } = concatErrorMessageWithSuggestions(
      getLocalizedMessage("plugins.bot.UnzipError"),
      suggestions
    );
    super(source, new.target.name, defaultMsg, localized);
  }
}
