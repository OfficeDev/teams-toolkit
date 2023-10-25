// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ApiSecretRegistrationClientSecret } from "./ApiSecretRegistrationClientSecret";

export interface ApiSecretRegistration {
  /**
   * Max 128 characters
   */
  id: string;
  /**
   * Max 128 characters
   */
  description: string;
  clientSecrets: ApiSecretRegistrationClientSecret[];
  tenantId?: string;
  /**
   * Currently max length 1
   */
  targetUrlsShouldStartWith?: string[];
  /**
   * Teams app Id associated with the ApiSecretRegistration
   */
  specificAppId?: string;
  applicableToApps?: ApiSecretRegistrationAppType[];
}

export enum ApiSecretRegistrationAppType {
  SpecificApp = "SpecificApp",
  AnyApps = "AnyApp",
}
