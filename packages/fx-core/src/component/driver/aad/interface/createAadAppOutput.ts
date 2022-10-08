// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface CreateAadAppOutput {
  // Non secrets
  AAD_APP_CLIENT_ID?: string;
  AAD_APP_OBJECT_ID?: string;
  AAD_APP_TENANT_ID?: string;
  AAD_APP_OAUTH_AUTHORITY_HOST?: string;
  AAD_APP_OAUTH_AUTHORITY?: string;

  // Secrets. Values with SECRET_ prefix will be encrypted when saving to disk.
  SECRET_AAD_APP_CLIENT_SECRET?: string; // there will be no client secret if generateClientSecret parameter is false
}
