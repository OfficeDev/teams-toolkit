// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface AccessTokenResult {
  scope: string;
  expires_on: number;
  access_token: string;
}
