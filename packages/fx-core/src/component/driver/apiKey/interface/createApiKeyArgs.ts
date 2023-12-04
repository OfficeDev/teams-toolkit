// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface CreateApiKeyArgs {
  name: string; // The name of Api Secret
  appId: string; // Teams app id
  clientSecret?: string; // The api secret
  apiSpecPath: string; // The location of api spec file
}
