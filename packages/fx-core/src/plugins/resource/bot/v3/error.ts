import { UserError } from "../../../../../../api/build";
import { Messages } from "../resources/messages";
import { FxBotPluginResultFactory } from "../result";

export class PreconditionError extends UserError {
  constructor(message: string, suggestions: string[]) {
    super(
      new.target.name,
      `${message}. Suggestions: ${suggestions.join(" ")}`,
      FxBotPluginResultFactory.source
    );
  }
}

export class TemplateZipFallbackError extends UserError {
  constructor() {
    super(
      new.target.name,
      `Failed to download zip package and open local zip package. Suggestions: ${[
        Messages.CheckOutputLogAndTryToFix,
        Messages.RetryTheCurrentStep,
      ].join(" ")}`,
      FxBotPluginResultFactory.source
    );
  }
}

export class UnzipError extends UserError {
  constructor(path?: string) {
    super(
      new.target.name,
      `Failed to unzip templates and write to disk. Suggestions: ${[
        Messages.CheckOutputLogAndTryToFix,
        Messages.ReopenWorkingDir(path),
        Messages.RetryTheCurrentStep,
      ].join(" ")}`,
      FxBotPluginResultFactory.source
    );
  }
}

export function CheckThrowSomethingMissing(name: string, value: any): void {
  if (!value) {
    throw new PreconditionError(Messages.SomethingIsMissing(name), [Messages.RetryTheCurrentStep]);
  }
}

export class PackDirectoryExistenceError extends UserError {
  constructor() {
    super(
      new.target.name,
      `${Messages.SomethingIsNotExisting("pack directory")} Suggestions: ${[
        Messages.RecreateTheProject,
      ].join(" ")}`,
      FxBotPluginResultFactory.source
    );
  }
}
