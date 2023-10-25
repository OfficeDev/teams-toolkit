// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface ApiSecret {
  id?: string;
  tenantId?: string;
  description: string;
  targetUrlsShouldStartWith: string[];
  applicableToApps: "SpecificApp";
  specificAppId: string;
  clientSecret?: ApiSecretClientSecret[];
  targetAudience: "AnyTenant" | "HomeTenant";
  manageableByUser: ApiSecretManageableByUser[];
}

export interface ApiSecretClientSecret {
  id?: string;
  value: string;
  isValueRedacted?: boolean;
  description: string;
  craetedDateTime?: string;
  priority: 0 | 1 | 2;
}

interface ApiSecretManageableByUser {
  userId: string;
  accessType: "Read" | "ReadWrite";
}
