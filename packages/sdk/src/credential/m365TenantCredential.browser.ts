// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AccessToken, TokenCredential, GetTokenOptions } from "@azure/identity";
import { formatString } from "../util/utils";
import { ErrorCode, ErrorMessage, ErrorWithCode } from "../core/errors";

/**
 * Represent Microsoft 365 tenant identity, and it is usually used when user is not involved like time-triggered automation job.
 * 
 * @example
 * ```typescript
 * loadConfiguration(); // load configuration from environment variables
 * const credential = new M365TenantCredential();
 * ```
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
   * 
   * @throws {@link ErrorCode|InvalidConfiguration} when client id, client secret or tenant id is not found in config.
   * @throws {@link ErrorCode|RuntimeNotSupported} when runtime is nodeJS.
   * 
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
   * @example
   * ```typescript
   * await credential.getToken(["User.Read.All"]) // Get Graph access token for single scope using string array
   * await credential.getToken("User.Read.All") // Get Graph access token for single scope using string
   * await credential.getToken(["User.Read.All", "Calendars.Read"]) // Get Graph access token for multiple scopes using string array
   * await credential.getToken("User.Read.All Calendars.Read") // Get Graph access token for multiple scopes using space-separated string
   * await credential.getToken("https://graph.microsoft.com/User.Read.All") // Get Graph access token with full resource URI
   * await credential.getToken(["https://outlook.office.com/Mail.Read"]) // Get Outlook access token
   * ```
   * 
   * @param {string | string[]} scopes - The list of scopes for which the token will have access.
   * @param {GetTokenOptions} options - The options used to configure any requests this TokenCredential implementation might make.
   *
   * @throws {@link ErrorCode|ServiceError} when get access token with authentication error.
   * @throws {@link ErrorCode|InternalError} when get access token with unknown error.
   * @throws {@link ErrorCode|InvalidParameter} when scopes is not a valid string or string array.
   * @throws {@link ErrorCode|RuntimeNotSupported} when runtime is nodeJS.
   * 
   * @returns Access token with expected scopes.
   * Throw error if get access token failed.
   * 
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
