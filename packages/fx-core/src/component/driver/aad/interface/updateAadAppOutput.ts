// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface UpdateAadAppOutput {
  // Non secrets
  AAD_APP_OAUTH2_PERMISSION_ID?: string; // only generated if manifest references AAD_APP_OAUTH2_PERMISSION_ID variable and process.env does not have it
}
