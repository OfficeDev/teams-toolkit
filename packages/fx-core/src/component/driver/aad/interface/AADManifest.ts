// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface AADManifest {
  id?: string | null;
  appId?: string | null;
  acceptMappedClaims?: boolean | null; // api.acceptMappedClaims
  accessTokenAcceptedVersion?: number | null; // api.requestedAccessTokenVersion
  addIns: AddIn[];
  allowPublicClient?: boolean | null; // isFallbackPublicClient
  appRoles: AppRole[];
  description?: string | null;
  disabledByMicrosoftStatus?: string | null;
  groupMembershipClaims?: string | null;
  identifierUris: string[];
  informationalUrls: InformationalUrls; // info
  keyCredentials: KeyCredential[];
  knownClientApplications: string[]; // api.knownClientApplications
  logoutUrl?: string | null; // web.logoutUrl
  name: string; // displayName
  notes?: string | null;
  oauth2AllowIdTokenImplicitFlow: boolean; // web.implicitGrantSettings.enableIdTokenIssuance
  oauth2AllowImplicitFlow: boolean; // web.implicitGrantSettings.enableAccessTokenIssuance
  oauth2Permissions: Oauth2Permission[]; // api.Oauth2PermissionScope
  optionalClaims?: OptionalClaims | null;
  parentalControlSettings?: ParentalControlSettings | null;
  preAuthorizedApplications: PreAuthorizedApplication[]; // api.preAuthorizedApplications
  replyUrlsWithType: ReplyUrlsWithType[];
  requiredResourceAccess: RequiredResourceAccess[];

  signInUrl?: string | null; // web.homePaghUrl
  signInAudience: string; // see web/spa in graph api
  tags: string[];
  tokenEncryptionKeyId?: string | null;

  // ***Not supported properties***
  // passwordCredentials: PasswordCredential[]; // This will be handled by separate logic
  // logoUrl: string; // info.logoUrl  readonly cannot change
  // createdDateTime: string; // readonly cannot change
  // publisherDomain: string; // readonly cannot change
  // oauth2RequirePostResponse: boolean; // not exist in graph api
  // oauth2AllowUrlPathMatching: boolean; // not exist in graph api
  // samlMetadataUrl: string; // not exist in graph api
  // orgRestrictions: string[]; // no reference
  // certification: any; // no reference
}

interface AppRole {
  allowedMemberTypes: string[];
  description: string;
  displayName: string;
  id: string;
  isEnabled: boolean;
  value: string;
  // lang?: string | null; graph api do not contain this property
}

interface InformationalUrls {
  termsOfService?: string | null; // info.termsOfServiceUrl
  support?: string | null; // info.supportUrl
  privacy?: string | null; // info.privacyStatementUrl
  marketing?: string | null; // info.marketingUrl
}

interface Oauth2Permission {
  adminConsentDescription: string;
  adminConsentDisplayName: string;
  id: string;
  isEnabled: boolean;
  type: string;
  userConsentDescription: string;
  userConsentDisplayName: string;
  value: string;
  lang?: string | null;
  origin?: string | null;
}

interface OptionalClaims {
  idToken: Token[];
  accessToken: Token[];
  saml2Token: Token[];
}

interface Token {
  additionalProperties: string[];
  essential: boolean;
  name: string;
  source?: string | null;
}

interface ParentalControlSettings {
  countriesBlockedForMinors: string[];
  legalAgeGroupRule?: string | null;
}

interface PreAuthorizedApplication {
  appId: string;
  permissionIds: string[]; //api.preAuthorizedApplication.delegatedPermissionIds
}

interface ReplyUrlsWithType {
  type: string;
  url: string;
}

interface RequiredResourceAccess {
  resourceAppId: string;
  resourceAccess: ResourceAccess[];
}

interface ResourceAccess {
  id: string;
  type: string;
}

interface KeyValuePair {
  key: string;
  value: string;
}

interface AddIn {
  id: string;
  properties: KeyValuePair[];
  type: string;
}

interface KeyCredential {
  customKeyIdentifier: string;
  endDate: string; // KeyCredential.endDateTime
  keyId: string;
  startDate: string; // KeyCredential.startDateTime
  type: string;
  usage: string;
  value: string; // KeyCredential.key
  displayName: string;
}

// Microsoft Graph API does not support updating PasswordCredential using manifest
// interface PasswordCredential {
//   displayName: string;
// }
