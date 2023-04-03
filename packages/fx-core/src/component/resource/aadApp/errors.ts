// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { getDefaultString, getLocalizedString } from "../../../common/localizeUtils";
import { ConfigKeys, Plugins } from "./constants";

const referHelpLink = "Please refer to the help link for further steps.";
const aadHelpLink = "https://aka.ms/teamsfx-aad-help";

export interface AadError {
  name: string;
  message: (...args: string[]) => [string, string];
  helpLink?: string;
}

export const GetAppError: AadError = {
  name: "AadGetAppError",
  message: (objectId: string, tenantId: string, fileName: string) => [
    getDefaultString(
      "error.aad.GetAppError",
      objectId,
      tenantId,
      Plugins.pluginNameComplex,
      fileName
    ),
    getLocalizedString(
      "error.aad.GetAppError",
      objectId,
      tenantId,
      Plugins.pluginNameComplex,
      fileName
    ),
  ],
  helpLink: aadHelpLink,
};

export const GetAppConfigError: AadError = {
  name: "AadGetAppConfigError",
  message: (config: string, fileName: string) => [
    getDefaultString("error.aad.GetAppConfigError", config, Plugins.pluginNameComplex, fileName),
    getLocalizedString("error.aad.GetAppConfigError", config, Plugins.pluginNameComplex, fileName),
  ],
};

export const GetSkipAppConfigError: AadError = {
  name: "AadGetSkipAppConfigError",
  message: (fileName: string) => [
    getDefaultString(
      "error.aad.GetSkipAppConfigError",
      ConfigKeys.objectId,
      ConfigKeys.clientId,
      ConfigKeys.clientSecret,
      ConfigKeys.accessAsUserScopeId,
      Plugins.auth,
      fileName
    ),
    getLocalizedString(
      "error.aad.GetSkipAppConfigError",
      ConfigKeys.objectId,
      ConfigKeys.clientId,
      ConfigKeys.clientSecret,
      ConfigKeys.accessAsUserScopeId,
      Plugins.auth,
      fileName
    ),
  ],
  helpLink: aadHelpLink,
};

export const CreateAppError: AadError = {
  name: "AadCreateAppError",
  message: () => [
    getDefaultString("error.aad.CreateAppError"),
    getLocalizedString("error.aad.CreateAppError"),
  ],
};

export const CreateAppForbiddenError: AadError = {
  name: "AadCreateAppError",
  message: () => [
    getDefaultString("error.aad.CreateAppForbiddenError"),
    getLocalizedString("error.aad.CreateAppForbiddenError"),
  ],
  helpLink: "https://aka.ms/teamsfx-create-aad-itp",
};

export const CreateSecretError: AadError = {
  name: "AadCreateSecretError",
  message: () => [
    getDefaultString("error.aad.CreateSecretError"),
    getLocalizedString("error.aad.CreateSecretError"),
  ],
};

export const UpdateRedirectUriError: AadError = {
  name: "UpdateRedirectUriError",
  message: () => [
    getDefaultString("error.aad.UpdateRedirectUriError"),
    getLocalizedString("error.aad.UpdateRedirectUriError"),
  ],
};

export const UpdateAadAppError: AadError = {
  name: "UpdateAadAppError",
  message: (reason: string): [string, string] => [
    getDefaultString("error.aad.UpdateAadAppError", reason),
    getLocalizedString("error.aad.UpdateAadAppError", reason),
  ],
};

export const UpdateAadAppUsingManifestError: AadError = {
  name: "UpdateAadAppError",
  message: (reason: string): [string, string] => [
    getDefaultString("error.aad.UpdateAadAppUsingManifestError", reason),
    getLocalizedString("error.aad.UpdateAadAppUsingManifestError", reason),
  ],
};

export const UpdateAppIdUriError: AadError = {
  name: "UpdateAppIdUriError",
  message: () => [
    getDefaultString("error.aad.UpdateAppIdUriError", referHelpLink),
    getLocalizedString("error.aad.UpdateAppIdUriError", referHelpLink),
  ],
  helpLink: aadHelpLink,
};

export const UpdatePermissionError: AadError = {
  name: "AadUpdatePermissionError",
  message: () => [
    getDefaultString("error.aad.UpdatePermissionError"),
    getLocalizedString("error.aad.UpdatePermissionError"),
  ],
};

export const AppIdUriInvalidError: AadError = {
  name: "AadAppIdUriInvalid",
  message: () => [
    getDefaultString("error.aad.AppIdUriInvalidError"),
    getLocalizedString("error.aad.AppIdUriInvalidError"),
  ],
};

export const CannotGenerateIdentifierUrisError: AadError = {
  name: "CannotGenerateIdentifierUris",
  message: () => [
    getDefaultString("error.aad.CannotGenerateIdentifierUris"),
    getLocalizedString("error.aad.CannotGenerateIdentifierUris"),
  ],
};

export const InvalidSelectedPluginsError: AadError = {
  name: "InvalidSelectedPlugins",
  message: (message) => [
    getDefaultString("error.aad.InvalidSelectedPlugins", message),
    getLocalizedString("error.aad.InvalidSelectedPlugins", message),
  ],
};

export const ParsePermissionError: AadError = {
  name: "ParsePermissionError",
  message: () => [
    getDefaultString("error.aad.ParsePermissionError"),
    getLocalizedString("error.aad.ParsePermissionError"),
  ],
  helpLink: aadHelpLink,
};

export const UnhandledError: AadError = {
  name: "UnhandledError",
  message: () => [
    getDefaultString("error.common.UnhandledError"),
    getLocalizedString("error.common.UnhandledError"),
  ],
};

export const UnknownPermissionName: AadError = {
  name: "UnknownPermissionName",
  message: (name: string) => [
    getDefaultString("error.aad.UnknownPermissionName", name, referHelpLink),
    getLocalizedString("error.aad.UnknownPermissionName", name, referHelpLink),
  ],
  helpLink: aadHelpLink,
};

export const UnknownPermissionRole: AadError = {
  name: "UnknownPermissionRole",
  message: (roleName: string, resourceName: string) => [
    getDefaultString("error.aad.UnknownPermissionRole", roleName, resourceName, referHelpLink),
    getLocalizedString("error.aad.UnknownPermissionRole", roleName, resourceName, referHelpLink),
  ],
  helpLink: aadHelpLink,
};

export const UnknownPermissionScope: AadError = {
  name: "UnknownPermissionScope",
  message: (scopeName: string, resourceName: string) => [
    getDefaultString("error.aad.UnknownPermissionScope", scopeName, resourceName, referHelpLink),
    getLocalizedString("error.aad.UnknownPermissionScope", scopeName, resourceName, referHelpLink),
  ],
  helpLink: aadHelpLink,
};

export const GetTokenError: AadError = {
  name: "GetTokenError",
  message: (audience: string) => [
    getDefaultString("error.aad.GetTokenError", audience),
    getLocalizedString("error.aad.GetTokenError", audience),
  ],
};

export const TenantNotExistError: AadError = {
  name: "TenantNotExistError",
  message: () => [
    getDefaultString("error.aad.TenantNotExistError"),
    getLocalizedString("error.aad.TenantNotExistError"),
  ],
};

export const GetConfigError: AadError = {
  name: "GetConfigError",
  message: (message: string) => [message, message],
};

export const MissingPermissionsRequestProvider: AadError = {
  name: "MissingPermissionsRequestProvider",
  message: () => [
    getDefaultString("error.aad.MissingPermissionsRequestProvider"),
    getLocalizedString("error.aad.MissingPermissionsRequestProvider"),
  ],
};

export const CheckPermissionError: AadError = {
  name: "CheckPermissionError",
  message: () => [
    getDefaultString("error.aad.CheckPermissionError"),
    getLocalizedString("error.aad.CheckPermissionError"),
  ],
};

export const GrantPermissionError: AadError = {
  name: "GrantPermissionError",
  message: (resource: string, id: string) => [
    getDefaultString("error.aad.GrantPermissionError", resource, id),
    getLocalizedString("error.aad.GrantPermissionError", resource, id),
  ],
};

export const ListCollaboratorError: AadError = {
  name: "ListCollaboratorError",
  message: () => [
    getDefaultString("error.aad.ListCollaboratorError"),
    getLocalizedString("error.aad.ListCollaboratorError"),
  ],
};

export const AadManifestLoadError: AadError = {
  name: "AadManifestLoadError",
  message: (manifestPath: string, reason: string) => [
    getDefaultString("error.aad.AadManifestLoadError", manifestPath, reason),
    getLocalizedString("error.aad.AadManifestLoadError", manifestPath, reason),
  ],
};

export const AadManifestMissingName: AadError = {
  name: "AadManifestMissingName",
  message: () => [
    getDefaultString("error.aad.AadManifestMissingName"),
    getLocalizedString("error.aad.AadManifestMissingName"),
  ],
};

export const AADManifestMissingScopeIdForTeamsApp: AadError = {
  name: "AadManifestMissingScopeIdForTeamsApp",
  message: () => [
    getDefaultString("error.aad.AadManifestMissingScopeIdForTeamsApp"),
    getLocalizedString("error.aad.AadManifestMissingScopeIdForTeamsApp"),
  ],
};

export const AadManifestMissingObjectId: AadError = {
  name: "AadManifestMissingObjectId",
  message: () => [
    getDefaultString("error.aad.AadManifestMissingObjectId"),
    getLocalizedString("error.aad.AadManifestMissingObjectId"),
  ],
};

export const AadManifestMissingReplyUrlsWithType: AadError = {
  name: "AadManifestMissingReplyUrlsWithType",
  message: () => [
    getDefaultString("error.aad.AadManifestMissingReplyUrlsWithType"),
    getLocalizedString("error.aad.AadManifestMissingReplyUrlsWithType"),
  ],
};

export const AadManifestMissingIdentifierUris: AadError = {
  name: "AadManifestMissingIdentifierUris",
  message: () => [
    getDefaultString("error.aad.AadManifestMissingIdentifierUris"),
    getLocalizedString("error.aad.AadManifestMissingIdentifierUris"),
  ],
};

export const AadManifestNotProvisioned: AadError = {
  name: "AadManifestNotProvisioned",
  message: () => [
    getDefaultString("error.aad.AadManifestNotProvisioned"),
    getLocalizedString("error.aad.AadManifestNotProvisioned"),
  ],
};

export class ConfigErrorMessages {
  static readonly GetDisplayNameError: [string, string] = [
    getDefaultString("error.aad.GetDisplayNameError"),
    getLocalizedString("error.aad.GetDisplayNameError"),
  ];
  static readonly GetConfigError = (configName: string, plugin: string): [string, string] => [
    getDefaultString("error.aad.GetConfigError", configName, plugin),
    getLocalizedString("error.aad.GetConfigError", configName, plugin),
  ];
  static readonly FormatError = (type: string, value: string): [string, string] => [
    getDefaultString("error.aad.FormatError", type, value),
    getLocalizedString("error.aad.FormatError", type, value),
  ];
}

export class AppStudioErrorMessage {
  static readonly CreateFailed: [string, string] = [
    getDefaultString("error.aad.client.CreateFailed"),
    getLocalizedString("error.aad.client.CreateFailed"),
  ];
  static readonly UpdateFailed: [string, string] = [
    getDefaultString("error.aad.client.UpdateFailed"),
    getLocalizedString("error.aad.client.UpdateFailed"),
  ];
  static readonly CreateSecretFailed: [string, string] = [
    getDefaultString("error.aad.client.CreateSecretFailed"),
    getLocalizedString("error.aad.client.CreateSecretFailed"),
  ];
  static readonly GetFailed: [string, string] = [
    getDefaultString("error.aad.client.GetFailed"),
    getLocalizedString("error.aad.client.GetFailed"),
  ];

  static readonly AppDefinitionIsNull: [string, string] = [
    getDefaultString("error.aad.client.AppDefinitionIsNull"),
    getLocalizedString("error.aad.client.AppDefinitionIsNull"),
  ];
  static readonly AppObjectIdIsNull: [string, string] = [
    getDefaultString("error.aad.client.AppObjectIdIsNull"),
    getLocalizedString("error.aad.client.AppObjectIdIsNull"),
  ];
  static readonly EmptyResponse: [string, string] = [
    getDefaultString("error.aad.client.EmptyResponse"),
    getLocalizedString("error.aad.client.EmptyResponse"),
  ];
  static readonly ReachRetryLimit: [string, string] = [
    getDefaultString("error.aad.client.ReachRetryLimit"),
    getLocalizedString("error.aad.client.ReachRetryLimit"),
  ];
}

export class GraphClientErrorMessage {
  static readonly CreateFailed: [string, string] = [
    getDefaultString("error.aad.client.CreateFailed"),
    getLocalizedString("error.aad.client.CreateFailed"),
  ];
  static readonly UpdateFailed: [string, string] = [
    getDefaultString("error.aad.client.UpdateFailed"),
    getLocalizedString("error.aad.client.UpdateFailed"),
  ];
  static readonly CreateSecretFailed: [string, string] = [
    getDefaultString("error.aad.client.CreateSecretFailed"),
    getLocalizedString("error.aad.client.CreateSecretFailed"),
  ];
  static readonly GetFailed: [string, string] = [
    getDefaultString("error.aad.client.GetFailed"),
    getLocalizedString("error.aad.client.GetFailed"),
  ];
  static readonly CheckPermissionFailed: [string, string] = [
    getDefaultString("error.aad.client.CheckPermissionFailed"),
    getLocalizedString("error.aad.client.CheckPermissionFailed"),
  ];
  static readonly GrantPermissionFailed: [string, string] = [
    getDefaultString("error.aad.client.GrantPermissionFailed"),
    getLocalizedString("error.aad.client.GrantPermissionFailed"),
  ];

  static readonly AppDefinitionIsNull: [string, string] = [
    getDefaultString("error.aad.client.AppDefinitionIsNull"),
    getLocalizedString("error.aad.client.AppDefinitionIsNull"),
  ];
  static readonly AppObjectIdIsNull: [string, string] = [
    getDefaultString("error.aad.client.AppObjectIdIsNull"),
    getLocalizedString("error.aad.client.AppObjectIdIsNull"),
  ];
  static readonly EmptyResponse: [string, string] = [
    getDefaultString("error.aad.client.EmptyResponse"),
    getLocalizedString("error.aad.client.EmptyResponse"),
  ];
  static readonly UserObjectIdIsNull: [string, string] = [
    getDefaultString("error.aad.client.ReachRetryLimit"),
    getLocalizedString("error.aad.client.ReachRetryLimit"),
  ];
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
  static readonly AccessTokenAcceptedVersionIs1 = getLocalizedString(
    "error.aad.manifest.AccessTokenAcceptedVersionIs1"
  );
  static readonly OptionalClaimsIsMissing = getLocalizedString(
    "error.aad.manifest.OptionalClaimsIsMissing"
  );
  static readonly OptionalClaimsMissingIdtypClaim = getLocalizedString(
    "error.aad.manifest.OptionalClaimsMissingIdtypClaim"
  );
  static readonly AADManifestIssues = getLocalizedString("error.aad.manifest.AADManifestIssues");

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
