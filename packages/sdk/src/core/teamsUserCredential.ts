// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AccessToken, TokenCredential, GetTokenOptions } from "@azure/identity";
import { UserInfo } from "../models/userinfo";
import { ErrorWithCode, ErrorCode, ErrorMessage } from "../core/errors";
import { formatString } from "../util/utils";

/**
 * Used within Teams client applications.
 *
 * @remarks
 * User can interactively login and consent within Teams.
 *
 * @beta
 */
export class TeamsUserCredential implements TokenCredential {
  /**
   * Constructor of TeamsUserCredential
   *
   * @param {Configuration} config
   * @throws {RuntimeNotSupported} if runtime is nodeJS
   *
   */
  constructor() {
    throw new ErrorWithCode(
      formatString(ErrorMessage.NodejsRuntimeNotSupported, "TeamsUserCredential"),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * Popup login page to get user's access token, will throw {@link ErrorWithCode} if failed.
   *
   * @remarks Only works in Teams client app. User will be redirected to the authorization page to login and consent.
   * The access token would be managed by the SDK and cached in the localStorage.
   *
   * @example
   * ```typescript
   * await credential.login(["User.Read"]);
   * ```
   * @param scopes - The array of Microsoft Token scope of access. Default value is  `[.default]`. Scopes provide a way to manage permissions to protected resources.
   * @throws {RuntimeNotSupported} if runtime is nodeJS
   *
   */
  public async login(scopes: string | string[]): Promise<void> {
    throw new ErrorWithCode(
      formatString(ErrorMessage.NodejsRuntimeNotSupported, "TeamsUserCredential"),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * Get access token from credential
   *
   * @example
   * ```typescript
   * await credential.getToken([]) // Get SSO token
   * await credential.getToken("") // Get SSO token
   * await credential.getToken(["User.Read"]) // Get Graph access token
   * await credential.getToken("User.Read") // Get Graph access token
   * await credential.getToken(["User.Read", "Application.Read.All"]) // Get Graph access token for multiple scopes
   * await credential.getToken([".default"]) // Get Graph access token with default scope
   * await credential.getToken(".default") // Get Graph access token with default scope
   * await credential.getToken(["https://outlook.office.com/mail.read"]) // Get Outlook access token
   * ```
   *
   * @param {string | string[]} scopes - The list of scopes for which the token will have access.
   * @param {GetTokenOptions} options - The options used to configure any requests this TokenCredential implementation might make.
   *
   * @returns user access token of defined scopes.
   * If scopes is empty string or array, it returns SSO token.
   * If scopes is non-empty, it returns access token for target scope.
   * Throw error if get access token failed.
   * @throws {RuntimeNotSupported} if runtime is nodeJS
   *
   */
  async getToken(
    scopes: string | string[],
    options?: GetTokenOptions
  ): Promise<AccessToken | null> {
    throw new ErrorWithCode(
      formatString(ErrorMessage.NodejsRuntimeNotSupported, "TeamsUserCredential"),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * Get the user info from access token, will throw {@link ErrorWithCode} if token is invalid.
   *
   * @example
   * Get basic user info from SSO token
   * ```typescript
   * const currentUser = await credential.getUserInfo();
   * ```
   *
   * @returns UserInfo with user displayName, objectId and preferredUserName.
   * @throws {RuntimeNotSupported} if runtime is nodeJS
   *
   */
  public getUserInfo(): Promise<UserInfo> {
    throw new ErrorWithCode(
      formatString(ErrorMessage.NodejsRuntimeNotSupported, "TeamsUserCredential"),
      ErrorCode.RuntimeNotSupported
    );
  }
}
