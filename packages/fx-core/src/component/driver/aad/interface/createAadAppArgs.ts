// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface CreateAadAppArgs {
  name: string; // The name of AAD app
  generateClientSecret: boolean; // Whether generate client secret for the app
}
