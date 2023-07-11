// Copyright (c) Microsoft Corporation.
// Licensed under the MIT

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
