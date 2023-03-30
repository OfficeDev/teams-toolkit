// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { SignInAudience } from "./signInAudience";

export interface CreateAadAppArgs {
  name: string; // The name of AAD app
  generateClientSecret: boolean; // Whether generate client secret for the app
  signInAudience?: SignInAudience; // Specifies what Microsoft accounts are supported for the current application.
}
