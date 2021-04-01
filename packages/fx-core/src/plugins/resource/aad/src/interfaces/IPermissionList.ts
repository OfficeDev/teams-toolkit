// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface AppRole {
  allowedMemberTypes: string[];
  description: string;
  displayName: string;
  id: string;
  isEnabled: boolean;
  origin: string;
  value: string;
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

export interface Value {
  appId: string;
  displayName: string;
  appRoles: AppRole[];
  oauth2PermissionScopes: Oauth2PermissionScopes[];
}

export interface IPermissionList {
  value: Value[];
}
