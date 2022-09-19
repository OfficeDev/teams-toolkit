import { SystemError, UserError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";
import { ErrorMessage, LocalizedMessage } from "./messages";

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
  constructor(source: string, messages: LocalizedMessage, suggestions: LocalizedMessage[]) {
    const msg0 = getDefaultString(
      "plugins.baseErrorMessage",
      messages.default,
      suggestions.map((suggestion) => suggestion.default).join(" ")
    );
    const msg1 = getLocalizedString(
      "plugins.baseErrorMessage",
      messages.localized,
      suggestions.map((suggestion) => suggestion.localized).join(" ")
    );
    super(source, new.target.name, msg0, msg1);
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
    const msg0 = getDefaultString(
      "plugins.baseErrorMessage",
      ErrorMessage.SomethingIsNotExisting("pack directory").default,
      ErrorMessage.RecreateTheProject.default
    );
    const msg1 = getLocalizedString(
      "plugins.baseErrorMessage",
      ErrorMessage.SomethingIsNotExisting("pack directory").localized,
      ErrorMessage.RecreateTheProject.localized
    );
    super(source, new.target.name, msg0, msg1);
  }
}

export class ResourceNotFoundError extends SystemError {
  constructor(source: string, message: string) {
    super(
      source,
      new.target.name,
      getDefaultString("error.function.FindAppError"),
      getLocalizedString("error.function.FindAppError")
    );
  }
}

export class FindFunctionAppError extends ResourceNotFoundError {
  constructor(source: string) {
    super(source, "error.function.FindAppError");
  }
}

export class InvalidFeature extends UserError {
  constructor() {
    super({
      source: "fx",
      message: getDefaultString("error.InvalidFeature"),
      displayMessage: getLocalizedString("error.InvalidFeature"),
    });
  }
}
