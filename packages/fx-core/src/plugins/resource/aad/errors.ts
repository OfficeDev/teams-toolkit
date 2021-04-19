// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

const referLogMessage = "Please refer to the log for detailed information.";
const referHelpLink = "Please refer to the help link for further steps.";

export interface AadError {
  name: string;
  message: (...args: string[]) => string;
  helpLink?: string;
}

export const CreateAppError: AadError = {
  name: "AadCreateAppError",
  message: () => `Failed to create an app in Azure Active Directory. ${referLogMessage}`,
};

export const CreateSecretError: AadError = {
  name: "AadCreateSecretError",
  message: () => `Failed to create an application secret in Azure Active Directory. ${referLogMessage}`,
};

export const UpdateRedirectUriError: AadError = {
  name: "UpdateRedirectUriError",
  message: () =>
    `Failed to update application redirect URI in Azure Active Directory. ${referLogMessage}`,
};

export const UpdateAppIdUriError: AadError = {
  name: "UpdateAppIdUriError",
  message: () =>
    `Failed to update Application ID URI in Azure Active Directory. ${referLogMessage} ${referHelpLink}`,
  // TODO: add helplink
};

export const UpdatePermissionError: AadError = {
  name: "AadUpdatePermissionError",
  message: () =>
    `Failed to update application permission in Azure Active Directory. ${referLogMessage}`,
};

export const AppIdUriInvalidError: AadError = {
  name: "AadAppIdUriInvalid",
  message: () =>
    "Invalid Application ID URI. Provision your application before continuing.",
};

export const ParsePermissionError: AadError = {
  name: "ParsePermissionError",
  message: () => "Failed to parse permission request.",
};

export const UnhandledError: AadError = {
  name: "UnhandledError",
  message: () => "Unhandled Error.",
};

export const UnknownPermissionName: AadError = {
  name: "UnknownPermissionName",
  message: (name: string) => `Failed to find resource: ${name}. ${referHelpLink}`,
  //TODO: add helplink
};

export const UnknownPermissionRole: AadError = {
  name: "UnknownPermissionRole",
  message: (roleName: string, resourceName: string) =>
    `Failed to find role "${roleName}" for resource "${resourceName}". ${referHelpLink}`,
  //TODO: add helplink
};

export const UnknownPermissionScope: AadError = {
  name: "UnknownPermissionScope",
  message: (scopeName: string, resourceName: string) =>
    `Failed to find scope "${scopeName}" for resource "${resourceName}". ${referHelpLink}`,
  //TODO: add helplink
};

export const GetTokenError: AadError = {
  name: "GetTokenError",
  message: (audience: string) =>
    `Failed to get user login information for ${audience}.`,
};

export const TenantNotExistError: AadError = {
  name: "TenantNotExistError",
  message: () =>
    "Failed to get tenant information from user login.",
};

export const GetConfigError: AadError = {
  name: "GetConfigError",
  message: (message: string) => message,
};

export class ConfigErrorMessages {
  static readonly GetDisplayNameError = "Failed to get display name.";
  static readonly GetConfigError = (configName: string, plugin: string) =>
    `Failed to get configuration value "${configName}" for ${plugin}.`;
  static readonly FormatError = (type: string, value: string) =>
    `Invalid format for ${type}. Value: ${value}.`;
}

export class AppStudioErrorMessage {
  static readonly CreateFailed =
    "Failed to create an app in Azure Active Directory.";
  static readonly UpdateFailed =
    "Failed to update app in Azure Active Directory.";
  static readonly CreateSecretFailed =
    "Failed to create an application secret in Azure Active Directory.";

  static readonly AppDefinitionIsNull = "Missing app definition.";
  static readonly AppObjectIdIsNull = "Missing Object ID.";
  static readonly EmptyResponse = "Missing response.";
  static readonly ReachRetryLimit = "Exceeded retry limit.";
}

export class GraphClientErrorMessage {
  static readonly CreateFailed =
    "Failed to create an app in Azure Active Directory.";
  static readonly UpdateFailed =
    "Failed to update app in Azure Active Directory.";
  static readonly CreateSecretFailed =
    "Failed to create an application secret in Azure Active Directory.";

  static readonly AppDefinitionIsNull = "Missing app definition.";
  static readonly AppObjectIdIsNull = "Missing Object ID.";
  static readonly EmptyResponse = "Missing response.";
}
