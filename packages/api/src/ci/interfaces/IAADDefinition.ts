// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface IAadObject {
  clientId: string;
  clientSecret: string;
  objectId: string;
  oauth2PermissionScopeId: string;
  applicationIdUris: string;
  oauthAuthority: string;
  teamsMobileDesktopAppId: string;
  teamsWebAppId: string;
}

export interface IAadObjectLocal {
  local_clientId: string;
  local_clientSecret: string;
  local_objectId: string;
  local_oauth2PermissionScopeId: string;
  local_applicationIdUris: string;
  oauthAuthority: string;
  teamsMobileDesktopAppId: string;
  teamsWebAppId: string;
}

export interface Web {
  redirectUris: string[];
}

export interface Oauth2PermissionScopes {
  adminConsentDescription: string;
  adminConsentDisplayName: string;
  id: string;
  isEnabled: boolean;
  type: string;
  userConsentDescription: string;
  userConsentDisplayName: string;
  value: string;
}

export interface PreAuthorizedApplication {
  appId: string;
  delegatedPermissionIds: string[];
}

export interface Api {
  requestedAccessTokenVersion: number;
  oauth2PermissionScopes: Oauth2PermissionScopes[];
  preAuthorizedApplications: PreAuthorizedApplication[];
}

export interface AccessToken {
  name: string;
  source?: any;
  essential: boolean;
  additionalProperties: any[];
}

export interface OptionalClaims {
  accessToken: AccessToken[];
}

export interface ResourceAccess {
  id: string;
  type: string;
}

export interface RequiredResourceAccess {
  resourceAppId?: string;
  resourceAccess?: ResourceAccess[];
}

export interface PasswordCredential {
  hint?: string;
  id?: string;
  endDate?: string;
  startDate?: string;
  value?: string;
}

export interface IAADDefinition {
  displayName?: string;
  id?: string;
  appId?: string;
  identifierUris?: string[];
  web?: Web;
  signInAudience?: string;
  api?: Api;
  optionalClaims?: OptionalClaims;
  requiredResourceAccess?: RequiredResourceAccess[];
  passwordCredentials?: PasswordCredential[];
}
