import { UserError } from "@microsoft/teamsfx-api";
import { Messages } from "../resources/messages";
import { FxBotPluginResultFactory } from "../result";

export class PreconditionError extends UserError {
  constructor(messages: [string, string], suggestions: string[]) {
    super(
      FxBotPluginResultFactory.source,
      new.target.name,
      `${messages[0]}. Suggestions: ${suggestions.join(" ")}`,
      `${messages[1]}. Suggestions: ${suggestions.join(" ")}`
    );
  }
}

export class TemplateZipFallbackError extends UserError {
  constructor() {
    super(
      FxBotPluginResultFactory.source,
      new.target.name,
      `Failed to download zip package and open local zip package. Suggestions: ${[
        Messages.CheckOutputLogAndTryToFix,
        Messages.RetryTheCurrentStep,
      ].join(" ")}`
    );
  }
}

export class UnzipError extends UserError {
  constructor(path?: string) {
    super(
      FxBotPluginResultFactory.source,
      new.target.name,
      `Failed to unzip templates and write to disk. Suggestions: ${[
        Messages.CheckOutputLogAndTryToFix,
        Messages.ReopenWorkingDir(path),
        Messages.RetryTheCurrentStep,
      ].join(" ")}`
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
    const msg0 = `${Messages.SomethingIsNotExisting("pack directory")[0]} Suggestions: ${[
      Messages.RecreateTheProject[0],
    ].join(" ")}`;
    const msg1 = `${Messages.SomethingIsNotExisting("pack directory")[1]} Suggestions: ${[
      Messages.RecreateTheProject[1],
    ].join(" ")}`;
    super(FxBotPluginResultFactory.source, new.target.name, msg0, msg1);
  }
}
