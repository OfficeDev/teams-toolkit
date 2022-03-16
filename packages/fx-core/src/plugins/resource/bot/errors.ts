// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { GraphErrorCodes } from "../aad/errorCodes";
import { CreateAppError, CreateSecretError } from "../aad/errors";
import { ErrorNames, AzureConstants } from "./constants";
import { Messages } from "./resources/messages";
import { FxBotPluginResultFactory } from "./result";
import { getLocalizedString } from "../../../common/localizeUtils";

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

export function isErrorWithCode(e: InnerError): e is ErrorWithCode {
  return e instanceof Object && "code" in e && typeof e["code"] === "string";
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
  public details: string;
  public suggestions: string[];
  public errorType: ErrorType;
  public innerError?: InnerError;
  public helpLink?: string;

  constructor(
    type: ErrorType,
    name: string,
    details: string,
    suggestions: string[],
    innerError?: InnerError,
    helpLink?: string
  ) {
    super(details);
    this.name = name;
    this.details = details;
    this.suggestions = suggestions;
    this.errorType = type;
    this.innerError = innerError;
    this.helpLink = helpLink;
    Object.setPrototypeOf(this, PluginError.prototype);
  }

  genMessage(): string {
    let msg = `${this.message} `;
    if (this.suggestions.length > 0) {
      msg += getLocalizedString("plugins.bot.ErrorSuggestions", this.suggestions.join(" "));
    }
    return msg;
  }
}

export class PreconditionError extends PluginError {
  constructor(message: string, suggestions: string[]) {
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

export class UserInputsError extends PluginError {
  constructor(input: string, value: string) {
    super(
      ErrorType.USER,
      ErrorNames.USER_INPUTS_ERROR,
      Messages.SomethingIsInvalidWithValue(input, value),
      [Messages.InputValidValueForSomething(input)]
    );
  }
}

export class AADAppCheckingError extends PluginError {
  constructor(innerError?: InnerError) {
    super(
      ErrorType.USER,
      ErrorNames.CALL_APPSTUDIO_API_ERROR,
      Messages.FailToCallAppStudioForCheckingAADApp,
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

export class TemplateZipFallbackError extends PluginError {
  constructor() {
    super(
      ErrorType.USER,
      "TemplateZipFallbackError",
      "Failed to download zip package and open local zip package.",
      [Messages.CheckOutputLogAndTryToFix, Messages.RetryTheCurrentStep]
    );
  }
}

export class ClientCreationError extends PluginError {
  constructor(clientName: string, innerError?: InnerError) {
    super(
      ErrorType.USER,
      ErrorNames.CLIENT_CREATION_ERROR,
      Messages.FailToCreateSomeClient(clientName),
      [Messages.CheckOutputLogAndTryToFix, Messages.RetryTheCurrentStep],
      innerError
    );
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

export class MissingSubscriptionRegistrationError extends PluginError {
  constructor() {
    super(
      ErrorType.USER,
      ErrorNames.MISSING_SUBSCRIPTION_REGISTRATION_ERROR,
      Messages.TheSubsNotRegisterToUseBotService,
      [Messages.RegisterYouSubsToUseBot, Messages.ClickHelpButtonForDetails],
      undefined,
      FxBotPluginResultFactory.defaultHelpLink
    );
  }
}

export class UnzipError extends PluginError {
  constructor(path?: string) {
    super(ErrorType.USER, "UnzipError", "Failed to unzip templates and write to disk.", [
      Messages.CheckOutputLogAndTryToFix,
      Messages.ReopenWorkingDir(path),
      Messages.RetryTheCurrentStep,
    ]);
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

export class ConfigValidationError extends PluginError {
  constructor(name: string, value: string) {
    super(
      ErrorType.USER,
      ErrorNames.CONFIG_VALIDATION_ERROR,
      Messages.SomethingIsInvalidWithValue(name, value),
      [Messages.RecoverConfig, Messages.RecreateTheProject]
    );
  }
}

export class PackDirExistenceError extends PluginError {
  constructor() {
    super(
      ErrorType.USER,
      ErrorNames.PACK_DIR_EXISTENCE_ERROR,
      Messages.SomethingIsNotExisting("pack directory"),
      [Messages.RecreateTheProject]
    );
  }
}

export class ListPublishingCredentialsError extends PluginError {
  constructor(innerError?: InnerError) {
    super(
      ErrorType.USER,
      ErrorNames.LIST_PUBLISHING_CREDENTIALS_ERROR,
      Messages.FailToListPublishingCredentials,
      [Messages.CheckOutputLogAndTryToFix, Messages.RetryTheCurrentStep],
      innerError
    );
  }
}

export class ZipDeployError extends PluginError {
  constructor(innerError?: InnerError) {
    super(
      ErrorType.USER,
      ErrorNames.ZIP_DEPLOY_ERROR,
      Messages.FailToDoZipDeploy,
      [Messages.CheckOutputLogAndTryToFix, Messages.RetryTheCurrentStep],
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

export class DownloadError extends PluginError {
  constructor(url: string, innerError?: InnerError) {
    super(
      ErrorType.USER,
      ErrorNames.DOWNLOAD_ERROR,
      Messages.FailToDownloadFrom(url),
      ["Please check your network status and retry."],
      innerError
    );
  }
}

export class TemplateProjectNotFoundError extends PluginError {
  constructor() {
    super(
      ErrorType.USER,
      ErrorNames.TEMPLATE_PROJECT_NOT_FOUND_ERROR,
      Messages.SomethingIsNotFound("Template project for scaffold"),
      [Messages.RetryTheCurrentStep]
    );
  }
}

export class CommandExecutionError extends PluginError {
  constructor(cmd: string, innerError?: InnerError) {
    super(
      ErrorType.USER,
      ErrorNames.COMMAND_EXECUTION_ERROR,
      Messages.CommandExecutionFailed(cmd),
      [Messages.CheckCommandOutputAndTryToFixIt, Messages.RetryTheCurrentStep],
      innerError
    );
  }
}

export class InvalidBotDataError extends PluginError {
  constructor(innerError: InnerError) {
    super(
      ErrorType.USER,
      ErrorNames.INVALID_BOT_DATA_ERROR,
      isErrorWithMessage(innerError) ? innerError.message : "",
      [Messages.DeleteExistingBotChannelRegistration, Messages.DeleteBotAfterAzureAccountSwitching],
      innerError
    );
  }
}

export class RegisterResourceProviderError extends PluginError {
  constructor(innerError?: InnerError) {
    super(
      ErrorType.USER,
      "RegisterResourceProviderError",
      "Failed to register required resource provider for your app.",
      [
        Messages.RegisterRequiredRP(AzureConstants.requiredResourceProviders),
        Messages.CheckOutputLogAndTryToFix,
      ],
      innerError
    );
  }
}
