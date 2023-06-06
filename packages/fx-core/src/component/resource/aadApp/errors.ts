// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { getDefaultString, getLocalizedString } from "../../../common/localizeUtils";

export interface AadError {
  name: string;
  message: (...args: string[]) => [string, string];
  helpLink?: string;
}

export const CreateAppError: AadError = {
  name: "AadCreateAppError",
  message: () => [
    getDefaultString("error.aad.CreateAppError"),
    getLocalizedString("error.aad.CreateAppError"),
  ],
};

export const CreateSecretError: AadError = {
  name: "AadCreateSecretError",
  message: () => [
    getDefaultString("error.aad.CreateSecretError"),
    getLocalizedString("error.aad.CreateSecretError"),
  ],
};

export const UnhandledError: AadError = {
  name: "UnhandledError",
  message: () => [
    getDefaultString("error.common.UnhandledError"),
    getLocalizedString("error.common.UnhandledError"),
  ],
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

export class ConfigErrorMessages {
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
  static readonly ReachRetryLimit: [string, string] = [
    getDefaultString("error.aad.client.ReachRetryLimit"),
    getLocalizedString("error.aad.client.ReachRetryLimit"),
  ];
}

export class GraphClientErrorMessage {
  static readonly CheckPermissionFailed: [string, string] = [
    getDefaultString("error.aad.client.CheckPermissionFailed"),
    getLocalizedString("error.aad.client.CheckPermissionFailed"),
  ];
  static readonly GrantPermissionFailed: [string, string] = [
    getDefaultString("error.aad.client.GrantPermissionFailed"),
    getLocalizedString("error.aad.client.GrantPermissionFailed"),
  ];
  static readonly AppObjectIdIsNull: [string, string] = [
    getDefaultString("error.aad.client.AppObjectIdIsNull"),
    getLocalizedString("error.aad.client.AppObjectIdIsNull"),
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
