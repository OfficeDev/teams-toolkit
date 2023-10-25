// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface CreateApiSecretArgs {
  name: string; // The name of Api Secret
  appId: string; // Teams app id
  apiSecret?: string; // The api secret
}
