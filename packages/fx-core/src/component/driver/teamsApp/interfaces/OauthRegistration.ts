// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface OauthRegistration {
  oAuthConfigId?: string;
  /**
   * Max 128 characters
   */
  description?: string;

  clientId: string;
  clientSecret: string;
  tenantId: string;

  authorizationUrl: string;
  tokenEndpoint: string;
  refreshEndpoint: string;
  scopes: string[];

  /**
   * Teams app Id associated with the OauthRegistration, should be required if applicableToApps === "SpecificType"
   */
  specificAppId?: string;
  applicableToApps: OauthRegistrationAppType;
  /**
   * Default to be "HomeTenant"
   */
  targetAudience?: OauthRegistrationTargetAudience;
  manageableByUsers?: OauthRegistrationUser[];
}

export enum OauthRegistrationAppType {
  SpecificApp = "SpecificApp",
  AnyApp = "AnyApp",
}

export enum OauthRegistrationTargetAudience {
  HomeTenant = "HomeTenant",
  AnyTenant = "AnyTenant",
}

export interface OauthRegistrationUser {
  userId: string;
  accessType: OauthRegistrationUserAccessType;
}

export enum OauthRegistrationUserAccessType {
  Read = "Read",
  ReadWrite = "ReadWrite",
}
