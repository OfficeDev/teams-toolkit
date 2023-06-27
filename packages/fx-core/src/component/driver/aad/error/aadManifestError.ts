import { getLocalizedString } from "../../../../common/localizeUtils";

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
