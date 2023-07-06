// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

interface AppRole {
  allowedMemberTypes: string[];
  description: string;
  displayName: string;
  id: string;
  isEnabled: boolean;
  origin: string;
  value: string;
}

interface Oauth2PermissionScopes {
  adminConsentDescription: string;
  adminConsentDisplayName: string;
  id: string;
  isEnabled: boolean;
  type: string;
  userConsentDescription: string;
  userConsentDisplayName: string;
  value: string;
}

interface Value {
  appId: string;
  displayName: string;
  appRoles: AppRole[];
  oauth2PermissionScopes: Oauth2PermissionScopes[];
}

export interface IPermissionList {
  value: Value[];
}
