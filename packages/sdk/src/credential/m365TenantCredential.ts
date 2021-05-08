// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AccessToken,
  TokenCredential,
  GetTokenOptions,
  ClientSecretCredential,
  TokenCredentialOptions,
  AuthenticationError
} from "@azure/identity";
import { AuthenticationConfiguration } from "../models/configuration";
import { internalLogger } from "../util/logger";
import { validateScopesType, formatString } from "../util/utils";
import { getAuthenticationConfiguration } from "../core/configurationProvider";
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
  private readonly clientSecretCredential: ClientSecretCredential;

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
    internalLogger.info("Create M365 tenant credential");

    const config = this.loadAndValidateConfig();

    const tokenCredentialOptions: TokenCredentialOptions = {
      authorityHost: config.authorityHost
    };

    this.clientSecretCredential = new ClientSecretCredential(
      config.tenantId!,
      config.clientId!,
      config.clientSecret!,
      tokenCredentialOptions
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
    let accessToken;
    validateScopesType(scopes);
    const scopesStr = typeof scopes === "string" ? scopes : scopes.join(" ");
    internalLogger.info("Get access token with scopes: " + scopesStr);

    try {
      accessToken = await this.clientSecretCredential.getToken(scopes);
    } catch (err) {
      if (err instanceof AuthenticationError) {
        const authError = err as AuthenticationError;
        const errorMsg = `Get M365 tenant credential with authentication error: status code ${authError.statusCode}, error messages: ${authError.message}`;
        internalLogger.error(errorMsg);

        throw new ErrorWithCode(errorMsg, ErrorCode.ServiceError);
      } else {
        const errorMsg = "Get M365 tenant credential failed with error: " + err.message;
        internalLogger.error(errorMsg);
        throw new ErrorWithCode(errorMsg, ErrorCode.InternalError);
      }
    }

    if (!accessToken) {
      const errorMsg = "Get M365 tenant credential access token failed with empty access token";
      internalLogger.error(errorMsg);
      throw new ErrorWithCode(errorMsg, ErrorCode.InternalError);
    }

    return accessToken;
  }

  /**
   * Load and validate authentication configuration
   * @returns Authentication configuration
   */
  private loadAndValidateConfig(): AuthenticationConfiguration {
    internalLogger.verbose("Validate authentication configuration");

    const config = getAuthenticationConfiguration();

    if (!config) {
      internalLogger.error(ErrorMessage.AuthenticationConfigurationNotExists);
      throw new ErrorWithCode(
        ErrorMessage.AuthenticationConfigurationNotExists,
        ErrorCode.InvalidConfiguration
      );
    }

    if (config.clientId && config.clientSecret && config.tenantId) {
      return config;
    }

    const missingValues = [];

    if (!config.clientId) {
      missingValues.push("clientId");
    }

    if (!config.clientSecret) {
      missingValues.push("clientSecret");
    }

    if (!config.tenantId) {
      missingValues.push("tenantId");
    }

    const errorMsg = formatString(
      ErrorMessage.InvalidConfiguration,
      missingValues.join(", "),
      "undefined"
    );
    internalLogger.error(errorMsg);
    throw new ErrorWithCode(errorMsg, ErrorCode.InvalidConfiguration);
  }
}
