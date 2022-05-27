// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { GraphErrorCodes } from "../aad/errorCodes";
import { CreateAppError, CreateSecretError } from "../aad/errors";
import { ErrorNames, AzureConstants } from "./constants";
import { Messages } from "./resources/messages";
import { getDefaultString, getLocalizedString } from "../../../common/localizeUtils";
import { err, PluginContext, SystemError, UserError } from "@microsoft/teamsfx-api";
import { FxBotPluginResultFactory as ResultFactory, FxResult } from "./result";
import { Logger } from "./logger";
import { telemetryHelper } from "./utils/telemetry-helper";
import { CommonHostingError } from "../../../common/azure-hosting/hostingError";
import { ProgressBarFactory } from "./progressBars";

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

export function checkPrecondition<T>(message: [string, string], value: T | null | undefined): T {
  if (!value) {
    throw new PreconditionError(message, []);
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

export class TemplateZipFallbackError extends PluginError {
  constructor() {
    super(
      ErrorType.USER,
      "TemplateZipFallbackError",
      [
        getDefaultString("plugins.bot.TemplateZipFallbackError"),
        getLocalizedString("plugins.bot.TemplateZipFallbackError"),
      ],
      [Messages.CheckOutputLogAndTryToFix, Messages.RetryTheCurrentStep]
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

export class UnzipError extends PluginError {
  constructor(path?: string) {
    super(
      ErrorType.USER,
      "UnzipError",
      [getDefaultString("plugins.bot.UnzipError"), getLocalizedString("plugins.bot.UnzipError")],
      [
        Messages.CheckOutputLogAndTryToFix,
        Messages.ReopenWorkingDir(path),
        Messages.RetryTheCurrentStep,
      ]
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

export class ConfigValidationError extends PluginError {
  constructor(name: string, value: string) {
    super(
      ErrorType.USER,
      ErrorNames.CONFIG_VALIDATION_ERROR,
      Messages.SomethingIsInvalidWithValue(name, value),
      [Messages.RecoverConfig, Messages.RecreateTheProject[1]]
    );
  }
}

export class PackDirExistenceError extends PluginError {
  constructor() {
    super(
      ErrorType.USER,
      ErrorNames.PACK_DIR_EXISTENCE_ERROR,
      Messages.SomethingIsNotExisting("pack directory"),
      [Messages.RecreateTheProject[1]]
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

export class CommandExecutionError extends PluginError {
  constructor(cmd: string, path: string, innerError?: InnerError) {
    super(
      ErrorType.USER,
      ErrorNames.COMMAND_EXECUTION_ERROR,
      Messages.CommandExecutionFailed(cmd),
      [
        Messages.RunFailedCommand(cmd, path),
        Messages.CheckCommandOutputAndTryToFixIt,
        Messages.RetryTheCurrentStep,
      ],
      innerError
    );
  }
}

export class RegisterResourceProviderError extends PluginError {
  constructor(innerError?: InnerError) {
    super(
      ErrorType.USER,
      "RegisterResourceProviderError",
      [
        getDefaultString("plugins.bot.RegisterResourceProviderError"),
        getLocalizedString("plugins.bot.RegisterResourceProviderError"),
      ],
      [
        Messages.RegisterRequiredRP(AzureConstants.requiredResourceProviders),
        Messages.CheckOutputLogAndTryToFix,
      ],
      innerError
    );
  }
}

export function wrapError(
  e: InnerError,
  context: PluginContext,
  sendTelemetry: boolean,
  name: string
): FxResult {
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
      }
    }
  }
  Logger.error(errorMsg);
  if (e instanceof UserError || e instanceof SystemError) {
    const res = err(e);
    sendTelemetry && telemetryHelper.sendResultEvent(context, name, res);
    return res;
  }

  if (e instanceof PluginError || e instanceof CommonHostingError) {
    const result =
      e instanceof PluginError && e.errorType === ErrorType.SYSTEM
        ? ResultFactory.SystemError(e.name, [e.genMessage(), e.genDisplayMessage()], e.innerError)
        : ResultFactory.UserError(
            e.name,
            [e.genMessage(), e.genDisplayMessage()],
            e.innerError,
            e instanceof PluginError ? e.helpLink : ""
          );
    sendTelemetry && telemetryHelper.sendResultEvent(context, name, result);
    return result;
  } else {
    // Unrecognized Exception.
    const UnhandledErrorCode = "UnhandledError";
    sendTelemetry &&
      telemetryHelper.sendResultEvent(
        context,
        name,
        ResultFactory.SystemError(
          UnhandledErrorCode,
          [
            getDefaultString("plugins.bot.UnhandledError", errorMsg),
            getLocalizedString("plugins.bot.UnhandledError", errorMsg),
          ],
          isPluginError(e) ? e.innerError : undefined
        )
      );
    return ResultFactory.SystemError(UnhandledErrorCode, [errorMsg, errorMsg], innerError);
  }
}

export async function runWithExceptionCatching<T>(
  context: PluginContext,
  fn: () => Promise<FxResult>,
  sendTelemetry: boolean,
  name: string
): Promise<FxResult> {
  try {
    sendTelemetry && telemetryHelper.sendStartEvent(context, name);
    const res: FxResult = await fn();
    sendTelemetry && telemetryHelper.sendResultEvent(context, name, res);
    return res;
  } catch (e) {
    await ProgressBarFactory.closeProgressBar(false); // Close all progress bars.
    return wrapError(e, context, sendTelemetry, name);
  }
}
