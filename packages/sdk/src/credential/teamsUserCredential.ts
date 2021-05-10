// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AccessToken, TokenCredential, GetTokenOptions } from "@azure/identity";
import { UserInfo } from "../models/userinfo";
import { ErrorWithCode, ErrorCode, ErrorMessage } from "../core/errors";
import { formatString } from "../util/utils";

/**
 * Represent Teams current user's identity, and it is used within Teams client applications.
 *
 * @remarks
 * Can only be used within Teams.
 *
 * @beta
 */
export class TeamsUserCredential implements TokenCredential {
  /**
   * Constructor of TeamsUserCredential.
   * @remarks
   * Can only be used within Teams.
   * @beta
   */
  constructor() {
    throw new ErrorWithCode(
      formatString(ErrorMessage.NodejsRuntimeNotSupported, "TeamsUserCredential"),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * Popup login page to get user's access token with specific scopes.
   * @remarks
   * Can only be used within Teams.
   * @beta
   */
  public async login(scopes: string | string[]): Promise<void> {
    throw new ErrorWithCode(
      formatString(ErrorMessage.NodejsRuntimeNotSupported, "TeamsUserCredential"),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * Get access token from credential.
   * @remarks
   * Can only be used within Teams.
   * @beta
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
   * Get basic user info from SSO token
   * @remarks
   * Can only be used within Teams.
   * @beta
   */
  public getUserInfo(): Promise<UserInfo> {
    throw new ErrorWithCode(
      formatString(ErrorMessage.NodejsRuntimeNotSupported, "TeamsUserCredential"),
      ErrorCode.RuntimeNotSupported
    );
  }
}
