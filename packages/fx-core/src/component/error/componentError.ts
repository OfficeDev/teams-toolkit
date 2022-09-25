// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  SystemError,
  SystemErrorOptions,
  UserError,
  UserErrorOptions,
} from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../common/localizeUtils";
import { DeployConstant } from "../constant/deployConstant";

/**
 * component error
 * store more information in FxError's innerError property for telemetry, logging and debugging
 *
 * @property name name of error, for classification
 * @property message always save error message in english
 * @property errorType which type of error will throw to fx-core
 * @property displayMessage the message show to user, always save as localized message
 * @property helpLink link to help page, mostly no use
 * @property detail detail error message, http response, console output, etc..
 */
export class BaseComponentInnerError extends Error {
  errorType: "UserError" | "SystemError";
  helpLink?: string;
  displayMessage?: string;
  suggestionKey?: string[];
  detail?: string;

  constructor(
    errorType: "UserError" | "SystemError",
    name: string,
    messageKey?: string,
    messageParams?: string[],
    suggestionKey?: string[],
    detail?: string,
    helpLink?: string
  ) {
    super(
      messageKey
        ? messageParams
          ? getDefaultString(messageKey, ...messageParams)
          : getDefaultString(messageKey)
        : undefined
    );
    this.errorType = errorType;
    this.name = name;
    this.helpLink = helpLink;
    this.suggestionKey = suggestionKey;
    this.displayMessage = messageKey
      ? messageParams
        ? getLocalizedString(messageKey, ...messageParams)
        : getLocalizedString(messageKey)
      : undefined;
    this.detail = detail;
  }

  toFxError(): FxError {
    if (this.errorType === "UserError") {
      return new UserError({
        source: "Deploy",
        error: this,
        helpLink: this.helpLink,
        name: this.name,
        message: this.message,
        displayMessage: this.toDisplayMessage(),
      } as UserErrorOptions);
    } else {
      return new SystemError({
        source: DeployConstant.DEPLOY_ERROR_TYPE,
        name: this.name,
        message: this.message,
        error: this,
        helpLink: this.helpLink,
        displayMessage: this.toDisplayMessage(),
      } as SystemErrorOptions);
    }
  }

  /**
   * The suggestion message will be localized and add 'Suggestions:' by default
   * the final method will be like:
   *    'Error message. Suggestions: suggestion message'
   * can be overwritten by subclasses
   * @protected
   */
  protected toDisplayMessage(): string {
    const suggestion = this.suggestionKey?.map((key) => getLocalizedString(key)).join(" ");
    return this.displayMessage
      ? this.displayMessage + suggestion
        ? getLocalizedString("plugins.bot.ErrorSuggestions", suggestion)
        : ""
      : this.message;
  }
}

/**
 * component call external api error
 */
export class ExternalApiCallError extends BaseComponentInnerError {
  statusCode: number;

  constructor(
    name: string,
    message: string,
    statusCode: number,
    messageParams?: string[],
    suggestionKey?: string[],
    detail?: string,
    helpLink?: string
  ) {
    super("UserError", name, message, messageParams, suggestionKey, detail, helpLink);
    this.statusCode = statusCode;
  }
}

export class ExecuteCommandError extends BaseComponentInnerError {
  constructor(name: string, messageKey: string, messageParams: string[], error: string) {
    super(
      "UserError",
      name,
      messageKey,
      messageParams,
      ["plugins.bot.CheckCommandOutput", "suggestions.retryTheCurrentStep"],
      error
    );
  }

  static fromErrorOutput(commands: string[], error: unknown): ExecuteCommandError {
    return new ExecuteCommandError(
      "CommandExecutionError",
      "plugins.bot.RunFailedCommand",
      commands,
      typeof error === "string" ? error : JSON.stringify(error)
    );
  }
}

/**
 * parameter in environmental error or user input error
 */
export class PrerequisiteError extends BaseComponentInnerError {
  constructor(
    name: string,
    messageKey: string,
    messageParams: string[] | undefined,
    suggestionKey?: string[],
    helpLink?: string
  ) {
    super("UserError", name, messageKey, messageParams, suggestionKey, undefined, helpLink);
  }

  static somethingIllegal(
    name: string,
    messageKey: string,
    messageParams?: string[],
    helpLink?: string
  ): PrerequisiteError {
    return new PrerequisiteError(
      "Illegal" + PrerequisiteError.toCamel(name),
      messageKey,
      messageParams,
      undefined,
      helpLink
    );
  }

  static somethingMissing(name: string): PrerequisiteError {
    return new PrerequisiteError(
      PrerequisiteError.toCamel(name) + "IsMissing",
      "plugins.bot.SomethingIsMissing",
      [name]
    );
  }

  static toCamel(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
}
