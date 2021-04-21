// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ConfigKeys, Plugins } from "./constants";

const referLogMessage = "Please refer to the log for detailed information.";
const referHelpLink = "Please refer to the help link for further steps.";
const helpLinkPrefix = "https://aka.ms/teamsfx-aad-help";
const permissionRelatedErrors = "permissionrelatederrors";

export interface AadError {
  name: string;
  message: (...args: string[]) => string;
  helpLink?: string;
}

export const GetAppError: AadError = {
  name: "AadGetAppError",
  message: (objectId: string) => `Failed to get app info with Object ID: ${objectId}. ` +
    "Please make sure object id is valid, " +
    `or delete 'objectId' under ${Plugins.pluginNameComplex} in env.default.json and try again.`,
};

export const GetAppConfigError: AadError = {
  name: "AadGetAppConfigError",
  message: (config: string) => `Failed to get ${config} from Azure AD app settings.` +
    "Please make sure Azure AD app is correctly configured, " +
    `or delete 'objectId' under ${Plugins.pluginNameComplex} in env.default.json and try again.`,
};

export const GetSkipAppConfigError: AadError = {
  name: "AadGetSkipAppConfigError",
  message: () => `Failed to get all necessary info. You need to set ${ConfigKeys.objectId}, ${ConfigKeys.clientId}, ${ConfigKeys.clientSecret}, ` +
  `${ConfigKeys.oauth2PermissionScopeId} under ${Plugins.pluginNameComplex} in env.default.json.`,
  helpLink: `${helpLinkPrefix}#aadgetskipappconfigerror`,
};

export const CreateAppError: AadError = {
  name: "AadCreateAppError",
  message: () => `Failed to create Azure AD app. ${referLogMessage}`,
};

export const CreateSecretError: AadError = {
  name: "AadCreateSecretError",
  message: () => `Failed to create secret for Azure AD app. ${referLogMessage}`,
};

export const UpdateRedirectUriError: AadError = {
  name: "UpdateRedirectUriError",
  message: () =>
    `Failed to update redriect uri for Azure AD app. ${referLogMessage}`,
};

export const UpdateAppIdUriError: AadError = {
  name: "UpdateAppIdUriError",
  message: () =>
    `Failed to update application id uri for Azure AD app. ${referLogMessage} ${referHelpLink}`,
  helpLink: `${helpLinkPrefix}#updateappidurierror`,
};

export const UpdatePermissionError: AadError = {
  name: "AadUpdatePermissionError",
  message: () =>
    `Failed to update permission for Azure AD app. ${referLogMessage}`,
};

export const AppIdUriInvalidError: AadError = {
  name: "AadAppIdUriInvalid",
  message: () =>
    "Invalid application id uri. Please check whether frontend hosting or teams bot is provisioned.",
};

export const ParsePermissionError: AadError = {
  name: "ParsePermissionError",
  message: () => "Failed to parse the permission request.",
  helpLink: `${helpLinkPrefix}#${permissionRelatedErrors}`,
};

export const UnhandledError: AadError = {
  name: "UnhandledError",
  message: () => "Unhandled Error.",
};

export const UnknownPermissionName: AadError = {
  name: "UnknownPermissionName",
  message: (name: string) => `Unknown resource name ${name}. ${referHelpLink}`,
  helpLink: `${helpLinkPrefix}#${permissionRelatedErrors}`,
};

export const UnknownPermissionRole: AadError = {
  name: "UnknownPermissionRole",
  message: (roleName: string, resourceName: string) =>
    `Unknown role name "${roleName}" for resource "${resourceName}". ${referHelpLink}`,
  helpLink: `${helpLinkPrefix}#${permissionRelatedErrors}`,
};

export const UnknownPermissionScope: AadError = {
  name: "UnknownPermissionScope",
  message: (scopeName: string, resourceName: string) =>
    `Unknown scope name "${scopeName}" for resource "${resourceName}". ${referHelpLink}`,
  helpLink: `${helpLinkPrefix}#${permissionRelatedErrors}`,
};

export const GetTokenError: AadError = {
  name: "GetTokenError",
  message: (audience: string) =>
    `Failed to get user login information of ${audience}.`,
};

export const TenantNotExistError: AadError = {
  name: "TenantNotExistError",
  message: () =>
    "Failed to get tenant information from user login information.",
};

export const GetConfigError: AadError = {
  name: "GetConfigError",
  message: (message: string) => message,
};

export class ConfigErrorMessages {
  static readonly GetDisplayNameError = "Failed to get display name.";
  static readonly GetConfigError = (configName: string, plugin: string) =>
    `Failed to get config value of ${configName} from ${plugin}.`;
  static readonly FormatError = (type: string, value: string) =>
    `Invalid format for ${type}. Value: ${value}.`;
}

export class AppStudioErrorMessage {
  static readonly CreateFailed =
    "Create Azure AD app failed when calling App Studio Api.";
  static readonly UpdateFailed =
    "Update Azure AD app failed when calling App Studio Api.";
  static readonly CreateSecretFailed =
    "Create secret for Azure AD app failed when calling App Studio Api.";
  static readonly GetFailed =
    "Get Azure AD app failed then calling App Studio Api.";

  static readonly AppDefinitionIsNull = "App Definition is null.";
  static readonly AppObjectIdIsNull = "Object Id is null.";
  static readonly EmptyResponse = "Response is empty.";
  static readonly ReachRetryLimit = "Reach retry limit..";
}

export class GraphClientErrorMessage {
  static readonly CreateFailed =
    "Create Azure AD app failed when calling Graph Api.";
  static readonly UpdateFailed =
    "Update Azure AD app failed when calling Graph Api.";
  static readonly CreateSecretFailed =
    "Create secret for Azure AD app failed when calling Graph Api.";
  static readonly GetFailed =
    "Get Azure AD app failed then calling Graph Api.";

  static readonly AppDefinitionIsNull = "App Definition is null.";
  static readonly AppObjectIdIsNull = "Object Id is null.";
  static readonly EmptyResponse = "Response is empty.";
}
