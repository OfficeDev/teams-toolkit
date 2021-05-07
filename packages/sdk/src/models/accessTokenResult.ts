// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @internal
 */
export interface AccessTokenResult {
  scope: string;
  expires_on: number;
  access_token: string;
}
