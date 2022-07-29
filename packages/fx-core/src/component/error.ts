import { SystemError, UserError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";
import { ErrorMessage } from "./messages";

export class ActionNotExist extends SystemError {
  constructor(action: string) {
    super({
      source: "fx",
      message: getDefaultString("error.ActionNotExist", action),
      displayMessage: getLocalizedString("error.ActionNotExist", action),
    });
  }
}

export class ComponentNotExist extends SystemError {
  constructor(component: string) {
    super({
      source: "fx",
      message: getDefaultString("error.ComponentNotExist", component),
      displayMessage: getLocalizedString("error.ComponentNotExist", component),
    });
  }
}

export class BadComponent extends SystemError {
  constructor(source: string, component: string, property: string) {
    super({
      source,
      message: getDefaultString("error.BadComponent", component, property),
      displayMessage: getLocalizedString("error.BadComponent", component, property),
    });
  }
}

export class invalidProjectSettings extends SystemError {
  constructor(source: string, msg?: string) {
    super({
      source,
      message: getDefaultString("error.InvalidProjectSettingsFileError", msg || ""),
      displayMessage: getLocalizedString("error.InvalidProjectSettingsFileError", msg || ""),
    });
  }
}

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
        ErrorMessage.CheckOutputLogAndTryToFix,
        ErrorMessage.RetryTheCurrentStep,
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
        ErrorMessage.CheckOutputLogAndTryToFix,
        ErrorMessage.ReopenWorkingDir(path),
        ErrorMessage.RetryTheCurrentStep,
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
    throw new PreconditionError(source, ErrorMessage.SomethingIsMissing(name), [
      ErrorMessage.RetryTheCurrentStep,
    ]);
  }
  return value;
}

export class PackDirectoryExistenceError extends UserError {
  constructor(source: string) {
    const msg0 = `${ErrorMessage.SomethingIsNotExisting("pack directory")[0]} Suggestions: ${[
      ErrorMessage.RecreateTheProject[0],
    ].join(" ")}`;
    const msg1 = `${ErrorMessage.SomethingIsNotExisting("pack directory")[1]} Suggestions: ${[
      ErrorMessage.RecreateTheProject[1],
    ].join(" ")}`;
    super(source, new.target.name, msg0, msg1);
  }
}
