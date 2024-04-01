// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ApiSecretRegistrationClientSecret } from "./ApiSecretRegistrationClientSecret";

export interface ApiSecretRegistration {
  /**
   * Max 128 characters
   */
  id?: string;
  /**
   * Max 128 characters
   */
  description?: string;
  clientSecrets: ApiSecretRegistrationClientSecret[];
  tenantId?: string;
  /**
   * Currently max length 1
   */
  targetUrlsShouldStartWith: string[];
  /**
   * Teams app Id associated with the ApiSecretRegistration, should be required if applicableToApps === "SpecificType"
   */
  specificAppId?: string;
  applicableToApps: ApiSecretRegistrationAppType;
  /**
   * Default to be "HomeTenant"
   */
  targetAudience?: ApiSecretRegistrationTargetAudience;
  manageableByUsers?: ApiSecretRegistrationUser[];
}

export interface ApiSecretRegistrationUpdate {
  /**
   * Max 128 characters
   */
  description?: string;
  /**
   * Currently max length 1
   */
  targetUrlsShouldStartWith: string[];
  /**
   * Teams app Id associated with the ApiSecretRegistration, should be required if applicableToApps === "SpecificType"
   */
  specificAppId?: string;
  applicableToApps?: ApiSecretRegistrationAppType;
  /**
   * Default to be "HomeTenant"
   */
  targetAudience?: ApiSecretRegistrationTargetAudience;
  manageableByUsers?: ApiSecretRegistrationUser[];
}

export enum ApiSecretRegistrationAppType {
  SpecificApp = "SpecificApp",
  AnyApp = "AnyApp",
}

export enum ApiSecretRegistrationTargetAudience {
  HomeTenant = "HomeTenant",
  AnyTenant = "AnyTenant",
}

export enum ApiSecretRegistrationUserAccessType {
  Read = "Read",
  ReadWrite = "ReadWrite",
}

export interface ApiSecretRegistrationUser {
  userId: string;
  accessType: ApiSecretRegistrationUserAccessType;
}
