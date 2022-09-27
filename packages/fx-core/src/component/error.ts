// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { SystemError, UserError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";
import { concatErrorMessageWithSuggestions, ErrorMessage, LocalizedMessage } from "./messages";

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
    const msgWithSuggestions = concatErrorMessageWithSuggestions(messages, suggestions);
    super(source, new.target.name, msgWithSuggestions.default, msgWithSuggestions.localized);
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
    const msgWithSuggestions = concatErrorMessageWithSuggestions(
      ErrorMessage.SomethingIsNotExisting("pack directory"),
      [ErrorMessage.RecreateTheProject]
    );
    super(source, new.target.name, msgWithSuggestions.default, msgWithSuggestions.localized);
  }
}

export class ResourceNotFoundError extends SystemError {
  constructor(source: string, message: string) {
    super(source, new.target.name, getDefaultString(message), getLocalizedString(message));
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
