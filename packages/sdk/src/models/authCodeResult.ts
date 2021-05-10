// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @internal
 */
export interface AuthCodeResult {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}
