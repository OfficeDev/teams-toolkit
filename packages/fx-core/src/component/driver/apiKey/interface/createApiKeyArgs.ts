// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface CreateApiKeyArgs {
  name: string; // The name of Api Secret
  appId: string; // Teams app id
  clientSecret?: string; // The primary api secret
  secondaryClientSecret?: string; // The secondary api secret
  apiSpecPath: string; // The location of api spec file
}
