// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface AuthCodeResult {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}
