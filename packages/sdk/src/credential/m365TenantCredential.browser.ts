// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AccessToken, TokenCredential, GetTokenOptions } from "@azure/identity";
import { formatString } from "../util/utils";
import { ErrorCode, ErrorMessage, ErrorWithCode } from "../core/errors";

/**
 * Used when user is not involved.
 *
 * @remarks
 * Can only be used in server side code.
 *
 * @beta
 */
export class M365TenantCredential implements TokenCredential {
  /**
   * Constructor of ApplicationCredential
   * @throws {RuntimeNotSupported} if runtime is nodeJS
   *
   */
  constructor() {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "M365TenantCredential"),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * Get access token for credential
   *
   * @param {string | string[]} scopes - The list of scopes for which the token will have access. Should in the format of {resource uri}/.default.
   * @param {GetTokenOptions} options - The options used to configure any requests this TokenCredential implementation might make.
   * @throws {RuntimeNotSupported} if runtime is nodeJS
   *
   */
  async getToken(
    scopes: string | string[],
    options?: GetTokenOptions
  ): Promise<AccessToken | null> {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "M365TenantCredential"),
      ErrorCode.RuntimeNotSupported
    );
  }
}
