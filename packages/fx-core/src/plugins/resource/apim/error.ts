// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FxError, returnSystemError, returnUserError } from "@microsoft/teamsfx-api";
import { getLocalizedString } from "../../../common/localizeUtils";
import { ProjectConstants, ConfigRetryOperations, TeamsToolkitComponent } from "./constants";

enum ErrorType {
  User,
  System,
}

export interface IApimPluginError {
  type: ErrorType;
  code: string;
  message: (...args: string[]) => string;
  helpLink?: string;
}

// User error
export const NoValidOpenApiDocument: IApimPluginError = {
  type: ErrorType.User,
  code: "NoValidOpenApiDocument",
  message: () => getLocalizedString("plugins.apim.error.NoValidOpenApiDocument"),
  helpLink: ProjectConstants.helpLink,
};

export const InvalidOpenApiDocument: IApimPluginError = {
  type: ErrorType.User,
  code: "InvalidOpenApiDocument",
  message: (filePath: string) =>
    getLocalizedString("plugins.apim.error.InvalidOpenApiDocument", filePath),
  helpLink: ProjectConstants.helpLink,
};

export const EmptyTitleInOpenApiDocument: IApimPluginError = {
  type: ErrorType.User,
  code: "EmptyTitleInOpenApiDocument",
  message: (filePath: string) =>
    getLocalizedString("plugins.apim.error.EmptyTitleInOpenApiDocument", filePath),
  helpLink: ProjectConstants.helpLink,
};

export const EmptyVersionInOpenApiDocument: IApimPluginError = {
  type: ErrorType.User,
  code: "EmptyVersionInOpenApiDocument",
  message: (filePath: string) =>
    getLocalizedString("plugins.apim.error.EmptyVersionInOpenApiDocument", filePath),
  helpLink: ProjectConstants.helpLink,
};

export const InvalidAadObjectId: IApimPluginError = {
  type: ErrorType.User,
  code: "InvalidAadObjectId",
  message: (objectId: string) =>
    getLocalizedString("plugins.apim.error.InvalidAadObjectId", objectId),
  helpLink: ProjectConstants.helpLink,
};

export const EmptyConfigValue: IApimPluginError = {
  type: ErrorType.User,
  code: "EmptyConfigValue",
  message: (component: string, name: string, filePath: string, retryOperation: string) =>
    getLocalizedString(
      "plugins.apim.error.EmptyConfigValue",
      name,
      component,
      filePath,
      retryOperation
    ),
};

export const NoPluginConfig: IApimPluginError = {
  type: ErrorType.User,
  code: "NoPluginConfig",
  message: (component: string, retryOperation: string) =>
    getLocalizedString("plugins.apim.error.NoPluginConfig", component, retryOperation),
};

export const InvalidConfigValue: IApimPluginError = {
  type: ErrorType.User,
  code: "InvalidConfigValue",
  message: (component: string, name: string, message: string) =>
    getLocalizedString("plugins.apim.error.InvalidConfigValue", name, component, message),
};

export const ApimOperationError: IApimPluginError = {
  type: ErrorType.User,
  code: "ApimOperationError",
  message: (operation: string, resourceType: string) =>
    getLocalizedString("plugins.apim.error.ApimOperationError", operation, resourceType),
  helpLink: ProjectConstants.helpLink,
};

export const AadOperationError: IApimPluginError = {
  type: ErrorType.User,
  code: "AadOperationError",
  message: (operation: string, resourceType: string) =>
    getLocalizedString("plugins.apim.error.AadOperationError", operation, resourceType),
  helpLink: ProjectConstants.helpLink,
};

export const InvalidCliOptionError: IApimPluginError = {
  type: ErrorType.User,
  code: "InvalidCliOptionError",
  message: (reason) =>
    `${getLocalizedString("plugins.apim.error.InvalidCliOptionError")} ${reason}`,
};

// System error
export const NotImplemented: IApimPluginError = {
  type: ErrorType.System,
  code: "NotImplemented",
  message: () => getLocalizedString("plugins.apim.error.NotImplemented"),
};

export const InvalidFunctionEndpoint: IApimPluginError = {
  type: ErrorType.System,
  code: "InvalidFunctionEndpoint",
  message: () => getLocalizedString("plugins.apim.error.InvalidFunctionEndpoint"),
};

export const EmptyProperty: IApimPluginError = {
  type: ErrorType.System,
  code: "EmptyProperty",
  message: (name: string) => getLocalizedString("plugins.apim.error.EmptyProperty", name),
};

export const InvalidPropertyType: IApimPluginError = {
  type: ErrorType.System,
  code: "InvalidPropertyType",
  message: (name: string, type: string) =>
    getLocalizedString("plugins.apim.error.InvalidPropertyType", name, type),
};

export const ShortenToEmpty: IApimPluginError = {
  type: ErrorType.System,
  code: "ShortenToEmpty",
  message: (value: string) => getLocalizedString("plugins.apim.error.ShortenToEmpty", value),
};

export const UnhandledError: IApimPluginError = {
  type: ErrorType.System,
  code: "UnhandledError",
  message: () => getLocalizedString("plugins.apim.error.UnhandledError"),
};

export const FailedToParseResourceIdError: IApimPluginError = {
  type: ErrorType.User,
  code: "FailedToParseResourceId",
  message: (name: string, resourceId: string) =>
    getLocalizedString("plugins.apim.error.FailedToParseResourceIdError", name, resourceId),
};

export function BuildError(
  pluginError: IApimPluginError,
  innerError: Error,
  ...params: string[]
): FxError;
export function BuildError(pluginError: IApimPluginError, ...params: string[]): FxError;
export function BuildError(pluginError: IApimPluginError, ...params: any[]): FxError {
  let innerError: Error | undefined = undefined;
  if (params.length > 0 && params[0] instanceof Error) {
    innerError = params.shift();
  }

  const message = !innerError
    ? pluginError.message(...params)
    : `${pluginError.message(...params)} ${innerError?.message}`;
  switch (pluginError.type) {
    case ErrorType.User:
      return returnUserError(
        new Error(message),
        ProjectConstants.pluginShortName,
        pluginError.code,
        pluginError.helpLink,
        innerError
      );
    case ErrorType.System:
      return returnSystemError(
        new Error(message),
        ProjectConstants.pluginShortName,
        pluginError.code,
        pluginError.helpLink,
        innerError
      );
  }
}

// Assert
export function AssertNotEmpty(name: string, value: string | undefined): string;
export function AssertNotEmpty<T>(name: string, value: T | undefined): T;
export function AssertNotEmpty(name: string, value: any): any {
  if (!value) {
    throw BuildError(EmptyProperty, name);
  }

  return value;
}

export function AssertConfigNotEmpty(
  component: TeamsToolkitComponent,
  name: string,
  value: string | undefined,
  envName: string
): string {
  if (!value) {
    throw BuildError(
      EmptyConfigValue,
      component,
      name,
      ProjectConstants.configFilePathArmSupported(envName),
      ConfigRetryOperations[component][name]
    );
  }

  return value;
}
