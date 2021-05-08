// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AccessToken, TokenCredential, GetTokenOptions } from "@azure/identity";
import { formatString } from "../util/utils";
import { ErrorCode, ErrorMessage, ErrorWithCode } from "../core/errors";

/**
 * Represent Microsoft 365 tenant identity, and it is usually used when user is not involved.
 * 
 * @remarks
 * Only works in in server side.
 *
 * @beta
 */
export class M365TenantCredential implements TokenCredential {
  /**
   * Constructor of M365TenantCredential.
   * 
   * @remarks
   * Only works in in server side.
   * @beta
   */
  constructor() {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "M365TenantCredential"),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * Get access token for credential.
   * 
   * @remarks
   * Only works in in server side.
   * @beta
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
