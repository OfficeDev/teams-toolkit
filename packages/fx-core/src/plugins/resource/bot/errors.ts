// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Constants } from "../aad/constants";
import { GraphErrorCodes } from "../aad/errorCodes";
import { CreateAppError, CreateSecretError } from "../aad/errors";
import { ErrorNames, AzureConstants } from "./constants";
import { Messages } from "./resources/messages";
import { CommonStrings } from "./resources/strings";
import { FxBotPluginResultFactory } from "./result";

export enum ErrorType {
  User,
  System,
}

export class PluginError extends Error {
  public name: string;
  public details: string;
  public suggestions: string[];
  public errorType: ErrorType;
  public innerError?: any;
  public helpLink?: string;

  constructor(
    type: ErrorType,
    name: string,
    details: string,
    suggestions: string[],
    innerError?: any,
    helpLink?: string
  ) {
    super(details);
    this.name = name;
    this.details = details;
    this.suggestions = suggestions;
    this.errorType = type;
    this.innerError = innerError;
    this.helpLink = helpLink;
    this.inferFromInnerError();
    Object.setPrototypeOf(this, PluginError.prototype);
  }

  genMessage(): string {
    let msg = `${this.message} `;
    if (this.suggestions.length > 0) {
      msg += `Suggestions: ${this.suggestions.join(" ")}`;
    }
    return msg;
  }

  inferFromInnerError() {
    if (!this.innerError) return;

    const errorCode = this.innerError.response?.data?.error?.code;
    const helpLink = GraphErrorCodes.get(errorCode);
    if (helpLink) this.helpLink = helpLink;

    const statusCode = this.innerError.response?.status;
    if (!statusCode) return ;
    if (
      statusCode >= Constants.statusCodeUserError &&
      statusCode < Constants.statusCodeServerError
    ) {
      this.errorType = ErrorType.User;
    } else {
      this.errorType = ErrorType.System;
    }
  }
}

export class PreconditionError extends PluginError {
  constructor(message: string, suggestions: string[]) {
    super(ErrorType.User, ErrorNames.PRECONDITION_ERROR, message, suggestions);
  }
}

export class SomethingMissingError extends PreconditionError {
  constructor(something: string) {
    super(Messages.SomethingIsMissing(something), [Messages.RetryTheCurrentStep]);
  }
}
export function CheckThrowSomethingMissing(name: string, value: any): void {
  if (!value) {
    throw new SomethingMissingError(name);
  }
}

export class UserInputsError extends PluginError {
  constructor(input: string, value: string) {
    super(
      ErrorType.User,
      ErrorNames.USER_INPUTS_ERROR,
      Messages.SomethingIsInvalidWithValue(input, value),
      [Messages.InputValidValueForSomething(input)]
    );
  }
}

export class AADAppCheckingError extends PluginError {
  constructor(innerError?: any) {
    super(
      ErrorType.User,
      ErrorNames.CALL_APPSTUDIO_API_ERROR,
      Messages.FailToCallAppStudioForCheckingAADApp,
      [Messages.RetryTheCurrentStep],
      innerError
    );
  }
}

export class CreateAADAppError extends PluginError {
  constructor(innerError?: any) {
    super(ErrorType.User, CreateAppError.name, CreateAppError.message(), [], innerError);
  }
}

export class CreateAADSecretError extends PluginError {
  constructor(innerError?: any) {
    super(ErrorType.User, CreateSecretError.name, CreateSecretError.message(), [], innerError);
  }
}

export class TemplateZipFallbackError extends PluginError {
  constructor() {
    super(
      ErrorType.User,
      "TemplateZipFallbackError",
      "Failed to download zip package and open local zip package.",
      [Messages.CheckOutputLogAndTryToFix, Messages.RetryTheCurrentStep]
    );
  }
}

export class ClientCreationError extends PluginError {
  constructor(clientName: string, innerError?: any) {
    super(
      ErrorType.User,
      ErrorNames.CLIENT_CREATION_ERROR,
      Messages.FailToCreateSomeClient(clientName),
      [Messages.CheckOutputLogAndTryToFix, Messages.RetryTheCurrentStep],
      innerError
    );
  }
}

export class ProvisionError extends PluginError {
  constructor(resource: string, innerError?: any) {
    super(
      ErrorType.User,
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
      ErrorType.User,
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
    super(ErrorType.User, "UnzipError", "Failed to unzip templates and write to disk.", [
      Messages.CheckOutputLogAndTryToFix,
      Messages.ReopenWorkingDir(path),
      Messages.RetryTheCurrentStep,
    ]);
  }
}

export class ConfigUpdatingError extends PluginError {
  constructor(configName: string, innerError?: any) {
    super(
      ErrorType.User,
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
      ErrorType.User,
      ErrorNames.CONFIG_VALIDATION_ERROR,
      Messages.SomethingIsInvalidWithValue(name, value),
      [Messages.RecoverConfig, Messages.RecreateTheProject]
    );
  }
}

export class PackDirExistenceError extends PluginError {
  constructor() {
    super(
      ErrorType.User,
      ErrorNames.PACK_DIR_EXISTENCE_ERROR,
      Messages.SomethingIsNotExisting("pack directory"),
      [Messages.RecreateTheProject]
    );
  }
}

export class ListPublishingCredentialsError extends PluginError {
  constructor(innerError?: any) {
    super(
      ErrorType.User,
      ErrorNames.LIST_PUBLISHING_CREDENTIALS_ERROR,
      Messages.FailToListPublishingCredentials,
      [Messages.CheckOutputLogAndTryToFix, Messages.RetryTheCurrentStep],
      innerError
    );
  }
}

export class ZipDeployError extends PluginError {
  constructor(innerError?: any) {
    super(
      ErrorType.User,
      ErrorNames.ZIP_DEPLOY_ERROR,
      Messages.FailToDoZipDeploy,
      [Messages.CheckOutputLogAndTryToFix, Messages.RetryTheCurrentStep],
      innerError
    );
  }
}

export class MessageEndpointUpdatingError extends PluginError {
  constructor(endpoint: string, innerError?: any) {
    super(
      ErrorType.User,
      ErrorNames.MSG_ENDPOINT_UPDATING_ERROR,
      Messages.FailToUpdateMessageEndpoint(endpoint),
      [Messages.CheckOutputLogAndTryToFix, Messages.RetryTheCurrentStep],
      innerError
    );
  }
}

export class DownloadError extends PluginError {
  constructor(url: string, innerError?: any) {
    super(
      ErrorType.User,
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
      ErrorType.User,
      ErrorNames.TEMPLATE_PROJECT_NOT_FOUND_ERROR,
      Messages.SomethingIsNotFound("Template project for scaffold"),
      [Messages.RetryTheCurrentStep]
    );
  }
}

export class CommandExecutionError extends PluginError {
  constructor(cmd: string, innerError?: any) {
    super(
      ErrorType.User,
      ErrorNames.COMMAND_EXECUTION_ERROR,
      Messages.CommandExecutionFailed(cmd),
      [Messages.CheckCommandOutputAndTryToFixIt, Messages.RetryTheCurrentStep],
      innerError
    );
  }
}

export class FreeServerFarmsQuotaError extends PluginError {
  constructor(innerError?: any) {
    super(
      ErrorType.User,
      ErrorNames.FREE_SERVER_FARMS_QUOTA_ERROR,
      Messages.MaxFreeAppServicePlanIsTen,
      [Messages.DeleteFreeAppServicePlanOrChangeSku, Messages.ClickHelpButtonForDetails],
      innerError,
      FxBotPluginResultFactory.defaultHelpLink
    );
  }
}

export class InvalidBotDataError extends PluginError {
  constructor(innerError: any) {
    super(
      ErrorType.User,
      ErrorNames.INVALID_BOT_DATA_ERROR,
      innerError.message,
      [Messages.DeleteExistingBotChannelRegistration, Messages.DeleteBotAfterAzureAccountSwitching],
      innerError
    );
  }
}

export class RegisterResourceProviderError extends PluginError {
  constructor(innerError?: any) {
    super(
      ErrorType.User,
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

// for the use of migrating v1 project
export class MigrateV1ProjectError extends PluginError {
  constructor(innerError?: any) {
    super(
      ErrorType.User,
      "MigrateV1ProjectError",
      `Failed to migrate Teams Toolkit V1 project into '${CommonStrings.BOT_WORKING_DIR_NAME}'.`,
      [Messages.RollbackToV1Project, Messages.CheckOutputLogAndTryToFix],
      innerError
    );
  }
}
