// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AccessToken, GetTokenOptions, TokenCredential } from "@azure/identity";
import { UserInfo } from "../models/userinfo";
import { formatString } from "../util/utils";
import { ErrorWithCode, ErrorCode, ErrorMessage } from "../core/errors";

/**
 * Exchange access token using the OBO flow with SSO token.
 *
 * @remarks
 * Can only be used in server side.
 *
 * @beta
 */
export class OnBehalfOfUserCredential implements TokenCredential {
  /**
   * Constructor of OnBehalfOfUserCredential
   *
   * @param {string} ssoToken - User token provided by Teams SSO feature.
   * @throws {RuntimeNotSupported} if runtime is browser
   *
   */
  constructor(ssoToken: string) {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "OnBehalfOfUserCredential"),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * Get access token from credential
   *
   * @example
   * ```typescript
   * const token = await credential.getToken("https://graph.microsoft.com/User.Read"); // Get user access token with specific scope
   * const ssoToken = await credential.getToken(""); // Get user single sign-on token
   * ```
   * @param {string | string[]} scopes - The list of scopes for which the token will have access.
   * @param {GetTokenOptions} options - The options used to configure any requests this TokenCredential implementation might make.
   * @returns {AccessToken} Return access token with expected scopes.
   * Return SSO token if scopes is empty string or empty array.
   * @throws {RuntimeNotSupported} if runtime is browser
   *
   * @remarks
   * If error occurs during OBO flow, it will throw exception.
   *
   * @beta
   */
  async getToken(
    scopes: string | string[],
    options?: GetTokenOptions
  ): Promise<AccessToken | null> {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "OnBehalfOfUserCredential"),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * Get the user info from access token, will throw {@link ErrorWithCode} if token is invalid.
   *
   * @example
   * ```typescript
   * const currentUser = await credential.getUserInfo();
   * ```
   *
   * @returns Return UserInfo for current user.
   * @throws {RuntimeNotSupported} if runtime is browser
   *
   */
  public getUserInfo(): Promise<UserInfo> {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "OnBehalfOfUserCredential"),
      ErrorCode.RuntimeNotSupported
    );
  }
}
