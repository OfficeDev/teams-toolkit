// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AccessToken, TokenCredential, GetTokenOptions } from "@azure/identity";
import { UserInfo } from "../models/userinfo";
import {
  AuthenticationConfiguration,
  TeamsUserCredentialAuthConfig,
} from "../models/configuration";
import { ErrorWithCode, ErrorCode, ErrorMessage } from "../core/errors";
import { formatString } from "../util/utils";

/**
 * Represent Teams current user's identity, and it is used within Teams client applications.
 *
 * @remarks
 * Can only be used within Teams.
 */
export class TeamsUserCredential implements TokenCredential {
  /**
   * Constructor of TeamsUserCredential.
   * @remarks
   * Can only be used within Teams.
   */
  constructor(authConfig: TeamsUserCredentialAuthConfig);
  constructor(authConfig: AuthenticationConfiguration);
  constructor(authConfig: TeamsUserCredentialAuthConfig | AuthenticationConfiguration) {
    throw new ErrorWithCode(
      formatString(ErrorMessage.NodejsRuntimeNotSupported, "TeamsUserCredential"),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * Popup login page to get user's access token with specific scopes.
   *
   * @param {string[]} resources - The optional list of resources for full trust Teams apps.
   *
   * @remarks
   * Can only be used within Teams.
   */
  public async login(scopes: string | string[], resources?: string[]): Promise<void> {
    throw new ErrorWithCode(
      formatString(ErrorMessage.NodejsRuntimeNotSupported, "TeamsUserCredential"),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * Get access token from credential.
   * @remarks
   * Can only be used within Teams.
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
   *
   * @param {string[]} resources - The optional list of resources for full trust Teams apps.
   *
   * @remarks
   * Can only be used within Teams.
   */
  public getUserInfo(resources?: string[]): Promise<UserInfo> {
    throw new ErrorWithCode(
      formatString(ErrorMessage.NodejsRuntimeNotSupported, "TeamsUserCredential"),
      ErrorCode.RuntimeNotSupported
    );
  }
}
