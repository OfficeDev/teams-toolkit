// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ErrorNames } from "./constants";
import { Messages } from "./messages";
import { getDefaultString, getLocalizedString } from "../../../common/localizeUtils";
import { err, SystemError, UserError } from "@microsoft/teamsfx-api";
import { FxBotPluginResultFactory as ResultFactory, FxResult } from "./result";
import { CommonHostingError } from "../../../common/azure-hosting/hostingError";
import { CreateAppError, CreateSecretError } from "../aadApp/errors";
import { GraphErrorCodes } from "../aadApp/errorCodes";

export const ErrorType = {
  USER: "User",
  SYSTEM: "System",
} as const;

export type ErrorType = typeof ErrorType[keyof typeof ErrorType];

export type InnerError = HttpError | Error | ErrorWithMessage | ErrorWithCode | unknown;

export type HttpError = {
  response: {
    status?: number;
    data?: {
      errorMessage?: string;
      error?: {
        code?: string;
        message?: string;
      };
      errors?: any;
    };
  };
};

export type ErrorWithMessage = {
  message: string;
};

export type ErrorWithCode = {
  code: string;
};

export function isHttpError(e: InnerError): e is HttpError {
  return e instanceof Object && "response" in e;
}

export function isErrorWithMessage(e: InnerError): e is ErrorWithMessage {
  return e instanceof Object && "message" in e;
}

export function isPluginError(e: unknown): e is PluginError {
  return e instanceof Object && "innerError" in e;
}

function resolveInnerError(target: PluginError, helpLinkMap: Map<string, string>): void {
  if (!target.innerError) return;

  const statusCode = isHttpError(target.innerError) ? target.innerError.response?.status : 500;
  if (statusCode) {
    if (statusCode >= 400 && statusCode < 500) {
      target.errorType = ErrorType.USER;
    } else {
      target.errorType = ErrorType.SYSTEM;
    }
  }

  if (isHttpError(target.innerError)) {
    const errorCode = target.innerError.response?.data?.error?.code;
    if (errorCode) {
      const helpLink = helpLinkMap.get(errorCode);
      if (helpLink) target.helpLink = helpLink;
    }
  }
}

export class PluginError extends Error {
  public name: string;
  public details: [string, string];
  public suggestions: string[];
  public errorType: ErrorType;
  public innerError?: InnerError;
  public helpLink?: string;

  constructor(
    type: ErrorType,
    name: string,
    details: [string, string],
    suggestions: string[],
    innerError?: InnerError,
    helpLink?: string
  ) {
    super(details[0]);
    this.name = name;
    this.details = details;
    this.suggestions = suggestions;
    this.errorType = type;
    this.innerError = innerError;
    this.helpLink = helpLink;
    Object.setPrototypeOf(this, PluginError.prototype);
  }

  genMessage(): string {
    let msg = `${this.details[0]} `;
    if (this.suggestions.length > 0) {
      msg += getDefaultString("plugins.bot.ErrorSuggestions", this.suggestions.join(" "));
    }
    return msg;
  }
  genDisplayMessage(): string {
    let msg = `${this.details[1]} `;
    if (this.suggestions.length > 0) {
      msg += getLocalizedString("plugins.bot.ErrorSuggestions", this.suggestions.join(" "));
    }
    return msg;
  }
}

export class PreconditionError extends PluginError {
  constructor(message: [string, string], suggestions: string[]) {
    super(ErrorType.USER, ErrorNames.PRECONDITION_ERROR, message, suggestions);
  }
}

export class SomethingMissingError extends PreconditionError {
  constructor(something: string) {
    super(Messages.SomethingIsMissing(something), [Messages.RetryTheCurrentStep]);
  }
}

export function checkAndThrowIfMissing<T>(name: string, value: T | null | undefined): T {
  if (!value) {
    throw new SomethingMissingError(name);
  }
  return value;
}

export class AADAppCheckingError extends PluginError {
  constructor(innerError?: InnerError) {
    super(
      ErrorType.USER,
      ErrorNames.CALL_APPSTUDIO_API_ERROR,
      Messages.FailToCallAppStudioForCheckingAADApp as [string, string],
      [Messages.RetryTheCurrentStep],
      innerError
    );
  }
}

export class CreateAADAppError extends PluginError {
  constructor(innerError?: InnerError) {
    super(ErrorType.USER, CreateAppError.name, CreateAppError.message(), [], innerError);
    resolveInnerError(this, GraphErrorCodes);
  }
}

export class CreateAADSecretError extends PluginError {
  constructor(innerError?: InnerError) {
    super(ErrorType.USER, CreateSecretError.name, CreateSecretError.message(), [], innerError);
    resolveInnerError(this, GraphErrorCodes);
  }
}

export class ProvisionError extends PluginError {
  constructor(resource: string, innerError?: InnerError) {
    super(
      ErrorType.USER,
      ErrorNames.PROVISION_ERROR,
      Messages.FailToProvisionSomeResource(resource),
      [Messages.CheckOutputLogAndTryToFix, Messages.RetryTheCurrentStep],
      innerError
    );
  }
}

export class ConfigUpdatingError extends PluginError {
  constructor(configName: string, innerError?: InnerError) {
    super(
      ErrorType.USER,
      ErrorNames.CONFIG_UPDATING_ERROR,
      Messages.FailToUpdateConfigs(configName),
      [Messages.CheckOutputLogAndTryToFix, Messages.RetryTheCurrentStep],
      innerError
    );
  }
}

export class BotRegistrationNotFoundError extends PluginError {
  constructor(botId: string, innerError?: InnerError) {
    super(
      ErrorType.USER,
      ErrorNames.BOT_REGISTRATION_NOTFOUND_ERROR,
      Messages.BotRegistrationNotFoundWith(botId),
      [Messages.CheckOutputLogAndTryToFix],
      innerError
    );
  }
}

export class MessageEndpointUpdatingError extends PluginError {
  constructor(endpoint: string, innerError?: InnerError) {
    super(
      ErrorType.USER,
      ErrorNames.MSG_ENDPOINT_UPDATING_ERROR,
      Messages.FailToUpdateMessageEndpoint(endpoint),
      [Messages.CheckOutputLogAndTryToFix, Messages.RetryTheCurrentStep],
      innerError
    );
  }
}

//! context and name are only for telemetry, they may be empty if sendTelemetry is false
export function wrapError(e: InnerError): FxResult {
  let errorMsg = isErrorWithMessage(e) ? e.message : "";
  const innerError = isPluginError(e) ? e.innerError : undefined;
  if (innerError) {
    errorMsg += getLocalizedString(
      "plugins.bot.DetailedError",
      isErrorWithMessage(innerError) ? innerError.message : ""
    );
    if (isHttpError(innerError)) {
      if (innerError.response?.data?.errorMessage) {
        errorMsg += getLocalizedString(
          "plugins.bot.DetailedErrorReason",
          innerError.response?.data?.errorMessage
        );
      } else if (innerError.response?.data?.error?.message) {
        // For errors return from Graph API
        errorMsg += getLocalizedString(
          "plugins.bot.DetailedErrorReason",
          innerError.response?.data?.error?.message
        );
      } else if (innerError.response?.data?.errors) {
        // For errors return from App Studio API
        errorMsg += getLocalizedString(
          "plugins.bot.DetailedErrorReason",
          JSON.stringify(innerError.response?.data?.errors)
        );
      }
    }
  }
  if (e instanceof UserError || e instanceof SystemError) {
    const res = err(e);
    return res;
  }
  if (e instanceof PluginError || e instanceof CommonHostingError) {
    const message = e.genMessage();
    const displayMessage = e.genDisplayMessage();
    const result =
      e instanceof PluginError && e.errorType === ErrorType.SYSTEM
        ? ResultFactory.SystemError(e.name, [message, displayMessage], e.innerError)
        : ResultFactory.UserError(
            e.name,
            [message, displayMessage],
            e.innerError,
            e instanceof PluginError ? e.helpLink : ""
          );
    return result;
  } else {
    // Unrecognized Exception.
    const UnhandledErrorCode = "UnhandledError";
    return ResultFactory.SystemError(UnhandledErrorCode, [errorMsg, errorMsg], innerError);
  }
}
