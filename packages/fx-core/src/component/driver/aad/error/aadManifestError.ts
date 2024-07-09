// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";

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
}

export class UnknownResourceAppIdUserError extends UserError {
  constructor(actionName: string, unknownId: string) {
    super({
      source: actionName,
      name: "UnknownResourceAppId",
      message: getDefaultString("error.aad.manifest.UnknownResourceAppId", unknownId),
      displayMessage: getLocalizedString("error.aad.manifest.UnknownResourceAppId", unknownId),
      helpLink: "https://aka.ms/teamsfx-aad-manifest",
    });
  }
}

export class MissingResourceAppIdUserError extends UserError {
  constructor(actionName: string) {
    super({
      source: actionName,
      name: "MissingResourceAppId",
      message: getDefaultString("error.aad.manifest.ResourceAppIdIsMissing"),
      displayMessage: getLocalizedString("error.aad.manifest.ResourceAppIdIsMissing"),
      helpLink: "https://aka.ms/teamsfx-aad-manifest",
    });
  }
}

export class MissingResourceAccessIdUserError extends UserError {
  constructor(actionName: string) {
    super({
      source: actionName,
      name: "MissingResourceAccessId",
      message: getDefaultString("error.aad.manifest.ResourceAccessIdIsMissing"),
      displayMessage: getLocalizedString("error.aad.manifest.ResourceAccessIdIsMissing"),
      helpLink: "https://aka.ms/teamsfx-aad-manifest",
    });
  }
}

export class ResourceAccessShouldBeArrayUserError extends UserError {
  constructor(actionName: string) {
    super({
      source: actionName,
      name: "ResourceAccessShouldBeArray",
      message: getDefaultString("error.aad.manifest.ResourceAccessShouldBeArray"),
      displayMessage: getLocalizedString("error.aad.manifest.ResourceAccessShouldBeArray"),
      helpLink: "https://aka.ms/teamsfx-aad-manifest",
    });
  }
}

export class RequiredResourceAccessShouldBeArrayUserError extends UserError {
  constructor(actionName: string) {
    super({
      source: actionName,
      name: "RequiredResourceAccessShouldBeArray",
      message: getDefaultString("error.aad.manifest.RequiredResourceAccessShouldBeArray"),
      displayMessage: getLocalizedString("error.aad.manifest.RequiredResourceAccessShouldBeArray"),
      helpLink: "https://aka.ms/teamsfx-aad-manifest",
    });
  }
}

export class UnknownResourceAccessIdUserError extends UserError {
  constructor(actionName: string, unknownId: string) {
    super({
      source: actionName,
      name: "UnknownResourceAccessId",
      message: getDefaultString("error.aad.manifest.UnknownResourceAccessId", unknownId),
      displayMessage: getLocalizedString("error.aad.manifest.UnknownResourceAccessId", unknownId),
      helpLink: "https://aka.ms/teamsfx-aad-manifest",
    });
  }
}

export class UnknownResourceAccessTypeUserError extends UserError {
  constructor(actionName: string, unknownType: string) {
    super({
      source: actionName,
      name: "UnknownResourceAccessType",
      message: getDefaultString("error.aad.manifest.UnknownResourceAccessType", unknownType),
      displayMessage: getLocalizedString(
        "error.aad.manifest.UnknownResourceAccessType",
        unknownType
      ),
      helpLink: "https://aka.ms/teamsfx-aad-manifest",
    });
  }
}

export class DeleteOrUpdatePermissionFailedError extends UserError {
  constructor(actionName: string) {
    super({
      source: actionName,
      name: "DeleteOrUpdatePermissionFailed",
      message: getDefaultString("error.aad.manifest.DeleteOrUpdatePermissionFailed"),
      displayMessage: getLocalizedString("error.aad.manifest.DeleteOrUpdatePermissionFailed"),
      helpLink: "https://aka.ms/teamsfx-aad-manifest",
    });
  }
}

export class HostNameNotOnVerifiedDomainError extends UserError {
  constructor(actionName: string, errorMessage: string) {
    super({
      source: actionName,
      name: "HostNameNotOnVerifiedDomain",
      message: getDefaultString("error.aad.manifest.HostNameNotOnVerifiedDomain", errorMessage),
      displayMessage: getLocalizedString(
        "error.aad.manifest.HostNameNotOnVerifiedDomain",
        errorMessage
      ),
      helpLink: "https://aka.ms/teamsfx-multi-tenant",
    });
  }
}
