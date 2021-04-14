// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AccessToken, GetTokenOptions, TokenCredential } from "@azure/identity";
import { AuthenticationResult, ConfidentialClientApplication } from "@azure/msal-node";
import { config } from "../core/configurationProvider";
import { UserInfo } from "../models/userinfo";
import { internalLogger } from "../util/logger";
import { formatString, getExpirationNumberFromJWT, getUserInfoFromSsoToken } from "../util/utils";
import { ErrorWithCode, ErrorCode, ErrorMessage } from "./errors";

/**
 * Exchange access token using the OBO flow with SSO token.
 *
 * @remarks
 * Can only be used in server side.
 *
 * @beta
 */
export class OnBehalfOfUserCredential implements TokenCredential {
  private msalClient: ConfidentialClientApplication;
  private ssoToken: string;
  /**
   * Constructor of OnBehalfOfUserCredential
   *
   * @param {string} ssoToken - User token provided by Teams SSO feature.
   * @throws {InvalidConfiguration} if client id, client secret or authority host is not found in config.
   *
   */
  constructor(ssoToken: string) {
    internalLogger.info("Get on behalf of user credential");

    const missingConfigurations: string[] = [];
    if (!config?.authentication?.clientId) {
      missingConfigurations.push("clientId");
    }

    if (!config?.authentication?.authorityHost) {
      missingConfigurations.push("authorityHost");
    }

    if (!config?.authentication?.clientSecret) {
      missingConfigurations.push("clientSecret");
    }

    if (missingConfigurations.length != 0) {
      const errorMsg = formatString(
        ErrorMessage.InvalidConfiguration,
        missingConfigurations.join(", "),
        "undefined"
      );
      internalLogger.error(errorMsg);
      throw new ErrorWithCode(errorMsg, ErrorCode.InvalidConfiguration);
    }

    const authority: string =
      config.authentication?.authorityHost + "/" + config.authentication?.tenantId;
    this.msalClient = new ConfidentialClientApplication({
      auth: {
        clientId: config.authentication!.clientId!,
        authority: authority,
        clientSecret: config.authentication!.clientSecret!
      }
    });

    this.ssoToken = ssoToken;
  }

  /**
   * Get access token from credential
   *
   * @example
   * ```typescript
   * await credential.getToken([]) // Get user single sign-on token
   * await credential.getToken("") // Get user single sign-on token
   * await credential.getToken(["User.Read"]) // Get Graph access token
   * await credential.getToken("User.Read") // Get Graph access token
   * await credential.getToken(["User.Read", "Application.Read.All"]) // Get Graph access token for multiple scopes
   * await credential.getToken("User.Read Application.Read.All") // Get Graph access token for multiple scopes. Scopes is split by space in one string
   * ```
   * @param {string | string[]} scopes - The list of scopes for which the token will have access.
   * @param {GetTokenOptions} options - The options used to configure any requests this TokenCredential implementation might make.
   * @returns {AccessToken} Return access token with expected scopes.
   * Return SSO token if scopes is empty string or empty array.
   *
   * @throws {InternalError} if fail to acquire access token on behalf of user
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
    let scopesArray: string[] = typeof scopes === "string" ? scopes.split(" ") : scopes;
    scopesArray = scopesArray.filter((x) => x !== null && x !== "");

    let result: AccessToken | null;
    if (!scopesArray.length) {
      internalLogger.info("Get SSO token.");

      result = {
        token: this.ssoToken,
        expiresOnTimestamp: getExpirationNumberFromJWT(this.ssoToken)
      };
    } else {
      internalLogger.info("Get access token with scopes: " + scopesArray.join(" "));

      let authenticationResult: AuthenticationResult | null;
      try {
        authenticationResult = await this.msalClient.acquireTokenOnBehalfOf({
          oboAssertion: this.ssoToken,
          scopes: scopesArray
        });
      } catch (error) {
        const errorMsg = formatString(ErrorMessage.FailToAcquireTokenOnBehalfOfUser, error.message);
        internalLogger.error(errorMsg);
        // Todo based on error message, use different ErrorCode
        throw new ErrorWithCode(errorMsg, ErrorCode.InternalError);
      }

      if (!authenticationResult) {
        const errorMsg = "Access token is null";
        internalLogger.error(errorMsg);
        throw new ErrorWithCode(
          formatString(ErrorMessage.FailToAcquireTokenOnBehalfOfUser, errorMsg),
          ErrorCode.InternalError
        );
      }

      result = {
        token: authenticationResult.accessToken,
        expiresOnTimestamp: authenticationResult.expiresOn!.getTime()
      };
    }

    return result;
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
   *
   */
  public getUserInfo(): Promise<UserInfo> {
    internalLogger.info("Get basic user info from SSO token");
    const userInfo = getUserInfoFromSsoToken(this.ssoToken);
    return new Promise<UserInfo>((resolve) => {
      resolve(userInfo);
    });
  }
}
