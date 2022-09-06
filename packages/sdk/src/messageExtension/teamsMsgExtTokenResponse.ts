// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { TokenResponse } from "botframework-schema";

/**
 * Token response provided by Teams Bot SSO prompt
 */
export interface TeamsMsgExtTokenResponse extends TokenResponse {
  /**
   * SSO token for user
   */
  ssoToken: string;

  /**
   * Expire time of SSO token
   */
  ssoTokenExpiration: string;
}
