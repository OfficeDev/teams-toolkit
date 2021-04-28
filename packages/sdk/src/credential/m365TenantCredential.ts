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
import { formatString } from "../util/utils";
import { getAuthenticationConfiguration } from "../core/configurationProvider";
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
  private readonly clientSecretCredential: ClientSecretCredential;
  /**
   * Constructor of ApplicationCredential
   *
   * @throws {InvalidConfiguration}
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
   * Get access token for credential
   *
   * @param {string | string[]} scopes - The list of scopes for which the token will have access. Should in the format of {resource uri}/.default.
   * @param {GetTokenOptions} options - The options used to configure any requests this TokenCredential implementation might make.
   *
   * @throws {ServiceError}
   * @throws {InternalError}
   */
  async getToken(
    scopes: string | string[],
    options?: GetTokenOptions
  ): Promise<AccessToken | null> {
    let accessToken;
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
