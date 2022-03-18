// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { getLocalizedString } from "../../../common/localizeUtils";
import { ConfigKeys, Plugins } from "./constants";

const referHelpLink = "Please refer to the help link for further steps.";
const aadHelpLink = "https://aka.ms/teamsfx-aad-help";

export interface AadError {
  name: string;
  message: (...args: string[]) => string;
  helpLink?: string;
}

export const GetAppError: AadError = {
  name: "AadGetAppError",
  message: (objectId: string, tenantId: string, fileName: string) =>
    getLocalizedString(
      "error.aad.GetAppError",
      objectId,
      tenantId,
      Plugins.pluginNameComplex,
      fileName
    ),
  helpLink: aadHelpLink,
};

export const GetAppConfigError: AadError = {
  name: "AadGetAppConfigError",
  message: (config: string, fileName: string) =>
    getLocalizedString("error.aad.GetAppConfigError", config, Plugins.pluginNameComplex, fileName),
};

export const GetSkipAppConfigError: AadError = {
  name: "AadGetSkipAppConfigError",
  message: (fileName: string) =>
    getLocalizedString(
      "error.aad.GetSkipAppConfigError",
      ConfigKeys.objectId,
      ConfigKeys.clientId,
      ConfigKeys.clientSecret,
      ConfigKeys.accessAsUserScopeId,
      Plugins.auth,
      fileName
    ),
  helpLink: aadHelpLink,
};

export const CreateAppError: AadError = {
  name: "AadCreateAppError",
  message: () => getLocalizedString("error.aad.CreateAppError"),
};

export const CreateSecretError: AadError = {
  name: "AadCreateSecretError",
  message: () => getLocalizedString("error.aad.CreateSecretError"),
};

export const UpdateRedirectUriError: AadError = {
  name: "UpdateRedirectUriError",
  message: () => getLocalizedString("error.aad.UpdateRedirectUriError"),
};

export const UpdateAppIdUriError: AadError = {
  name: "UpdateAppIdUriError",
  message: () => getLocalizedString("error.aad.UpdateAppIdUriError", referHelpLink),
  helpLink: aadHelpLink,
};

export const UpdatePermissionError: AadError = {
  name: "AadUpdatePermissionError",
  message: () => getLocalizedString("error.aad.UpdatePermissionError"),
};

export const AppIdUriInvalidError: AadError = {
  name: "AadAppIdUriInvalid",
  message: () => getLocalizedString("error.aad.AppIdUriInvalidError"),
};

export const InvalidSelectedPluginsError: AadError = {
  name: "InvalidSelectedPlugins",
  message: (message) => getLocalizedString("error.aad.InvalidSelectedPlugins", message),
};

export const ParsePermissionError: AadError = {
  name: "ParsePermissionError",
  message: () => getLocalizedString("error.aad.ParsePermissionError"),
  helpLink: aadHelpLink,
};

export const UnhandledError: AadError = {
  name: "UnhandledError",
  message: () => getLocalizedString("error.aad.UnhandledError"),
};

export const UnknownPermissionName: AadError = {
  name: "UnknownPermissionName",
  message: (name: string) =>
    getLocalizedString("error.aad.UnknownPermissionName", name, referHelpLink),
  helpLink: aadHelpLink,
};

export const UnknownPermissionRole: AadError = {
  name: "UnknownPermissionRole",
  message: (roleName: string, resourceName: string) =>
    getLocalizedString("error.aad.UnknownPermissionRole", roleName, resourceName, referHelpLink),
  helpLink: aadHelpLink,
};

export const UnknownPermissionScope: AadError = {
  name: "UnknownPermissionScope",
  message: (scopeName: string, resourceName: string) =>
    getLocalizedString("error.aad.UnknownPermissionScope", scopeName, resourceName, referHelpLink),
  helpLink: aadHelpLink,
};

export const GetTokenError: AadError = {
  name: "GetTokenError",
  message: (audience: string) => getLocalizedString("error.aad.GetTokenError", audience),
};

export const TenantNotExistError: AadError = {
  name: "TenantNotExistError",
  message: () => getLocalizedString("error.aad.TenantNotExistError"),
};

export const GetConfigError: AadError = {
  name: "GetConfigError",
  message: (message: string) => message,
};

export const MissingPermissionsRequestProvider: AadError = {
  name: "MissingPermissionsRequestProvider",
  message: () => getLocalizedString("error.aad.MissingPermissionsRequestProvider"),
};

export const CheckPermissionError: AadError = {
  name: "CheckPermissionError",
  message: () => getLocalizedString("error.aad.CheckPermissionError"),
};

export const GrantPermissionError: AadError = {
  name: "GrantPermissionError",
  message: (resource: string, id: string) =>
    getLocalizedString("error.aad.GrantPermissionError", resource, id),
};

export const ListCollaboratorError: AadError = {
  name: "ListCollaboratorError",
  message: () => getLocalizedString("error.aad.ListCollaboratorError"),
};

export class ConfigErrorMessages {
  static readonly GetDisplayNameError = getLocalizedString("error.aad.GetDisplayNameError");
  static readonly GetConfigError = (configName: string, plugin: string) =>
    getLocalizedString("error.aad.GetConfigError", configName, plugin);
  static readonly FormatError = (type: string, value: string) =>
    getLocalizedString("error.aad.FormatError", type, value);
}

export class AppStudioErrorMessage {
  static readonly CreateFailed = getLocalizedString("error.aad.client.CreateFailed");
  static readonly UpdateFailed = getLocalizedString("error.aad.client.UpdateFailed");
  static readonly CreateSecretFailed = getLocalizedString("error.aad.client.CreateSecretFailed");
  static readonly GetFailed = getLocalizedString("error.aad.client.GetFailed");

  static readonly AppDefinitionIsNull = getLocalizedString("error.aad.client.AppDefinitionIsNull");
  static readonly AppObjectIdIsNull = getLocalizedString("error.aad.client.AppObjectIdIsNull");
  static readonly EmptyResponse = getLocalizedString("error.aad.client.EmptyResponse");
  static readonly ReachRetryLimit = getLocalizedString("error.aad.client.ReachRetryLimit");
}

export class GraphClientErrorMessage {
  static readonly CreateFailed = getLocalizedString("error.aad.client.CreateFailed");
  static readonly UpdateFailed = getLocalizedString("error.aad.client.UpdateFailed");
  static readonly CreateSecretFailed = getLocalizedString("error.aad.client.CreateSecretFailed");
  static readonly GetFailed = getLocalizedString("error.aad.client.GetFailed");
  static readonly CheckPermissionFailed = getLocalizedString(
    "error.aad.client.CheckPermissionFailed"
  );
  static readonly GrantPermissionFailed = getLocalizedString(
    "error.aad.client.GrantPermissionFailed"
  );

  static readonly AppDefinitionIsNull = getLocalizedString("error.aad.client.AppDefinitionIsNull");
  static readonly AppObjectIdIsNull = getLocalizedString("error.aad.client.AppObjectIdIsNull");
  static readonly EmptyResponse = getLocalizedString("error.aad.client.EmptyResponse");
  static readonly UserObjectIdIsNull = getLocalizedString("error.aad.client.ReachRetryLimit");
}

export class AadManifestErrorMessage {
  static readonly NameIsMissing = getLocalizedString("error.aad.manifest.NameIsMissing");
  static readonly SignInAudienceIsMissing = getLocalizedString(
    "error.aad.manifest.SignInAudienceIsMissing"
  );
  static readonly RequiredResourceAccessIsMissing = getLocalizedString(
    "error.aad.manifest.RequiredResourceAccessIsMissing"
  );
  static readonly Oauth2PermissionsIsMissing = getLocalizedString(
    "error.aad.manifest.Oauth2PermissionsIsMissing"
  );
  static readonly PreAuthorizedApplicationsIsMissing = getLocalizedString(
    "error.aad.manifest.PreAuthorizedApplicationsIsMissing"
  );
  static readonly TeamsMobileDesktopClientIdIsMissing = getLocalizedString(
    "error.aad.manifest.TeamsMobileDesktopClientIdIsMissing"
  );
  static readonly TeamsWebClientIdIsMissing = getLocalizedString(
    "error.aad.manifest.TeamsWebClientIdIsMissing"
  );
  static readonly AccessTokenAcceptedVersionIs1 = getLocalizedString(
    "error.aad.manifest.AccessTokenAcceptedVersionIs1"
  );
  static readonly OptionalClaimsIsMissing = getLocalizedString(
    "error.aad.manifest.OptionalClaimsIsMissing"
  );
  static readonly OptionalClaimsMissingIdtypClaim = getLocalizedString(
    "error.aad.manifest.OptionalClaimsMissingIdtypClaim"
  );

  static readonly UnknownResourceAppId = getLocalizedString(
    "error.aad.manifest.UnknownResourceAppId"
  );
  static readonly UnknownResourceAccessType = getLocalizedString(
    "error.aad.manifest.UnknownResourceAccessType"
  );
  static readonly UnknownResourceAccessId = getLocalizedString(
    "error.aad.manifest.UnknownResourceAccessId"
  );
}
