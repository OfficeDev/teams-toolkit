// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AccessToken, GetTokenOptions, TokenCredential } from "@azure/identity";
import { AuthenticationResult, ConfidentialClientApplication } from "@azure/msal-node";
import { config } from "../core/configurationProvider";
import { UserInfo } from "../models/userinfo";
import { internalLogger } from "../util/logger";
import { formatString, getUserInfoFromSsoToken, parseJwt, validateScopesType } from "../util/utils";
import { ErrorWithCode, ErrorCode, ErrorMessage } from "../core/errors";

/**
 * Represent on-behalf-of flow to get user identity, and it is designed to be used in Azure Function or Bot scenarios.
 *
 * @example
 * ```typescript
 * loadConfiguration(); // load configuration from environment variables
 * const credential = new OnBehalfOfUserCredential(ssoToken);
 * ```
 * 
 * @remarks
 * Can only be used in server side.
 *
 * @beta
 */
export class OnBehalfOfUserCredential implements TokenCredential {
  private msalClient: ConfidentialClientApplication;
  private ssoToken: AccessToken;

  /**
   * Constructor of OnBehalfOfUserCredential
   *
   * @remarks 
   * Only works in in server side.
   * 
   * @param {string} ssoToken - User token provided by Teams SSO feature.
   * 
   * @throws {@link ErrorCode|InvalidConfiguration} when client id, client secret, authority host or tenant id is not found in config.
   * @throws {@link ErrorCode|InternalError} when SSO token is not valid.
   * @throws {@link ErrorCode|RuntimeNotSupported} when runtime is browser.
   *
   * @beta
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

    if (!config?.authentication?.tenantId) {
      missingConfigurations.push("tenantId");
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

    const decodedSsoToken = parseJwt(ssoToken);
    this.ssoToken = {
      token: ssoToken,
      expiresOnTimestamp: decodedSsoToken.exp
    };
  }

  /**
   * Get access token from credential.
   *
   * @example
   * ```typescript
   * await credential.getToken([]) // Get SSO token using empty string array
   * await credential.getToken("") // Get SSO token using empty string
   * await credential.getToken([".default"]) // Get Graph access token with default scope using string array
   * await credential.getToken(".default") // Get Graph access token with default scope using string
   * await credential.getToken(["User.Read"]) // Get Graph access token for single scope using string array
   * await credential.getToken("User.Read") // Get Graph access token for single scope using string
   * await credential.getToken(["User.Read", "Application.Read.All"]) // Get Graph access token for multiple scopes using string array
   * await credential.getToken("User.Read Application.Read.All") // Get Graph access token for multiple scopes using space-separated string
   * await credential.getToken("https://graph.microsoft.com/User.Read") // Get Graph access token with full resource URI
   * await credential.getToken(["https://outlook.office.com/Mail.Read"]) // Get Outlook access token
   * ```
   * 
   * @param {string | string[]} scopes - The list of scopes for which the token will have access.
   * @param {GetTokenOptions} options - The options used to configure any requests this TokenCredential implementation might make.
   * 
   * @throws {@link ErrorCode|InternalError} when failed to acquire access token on behalf of user with unknown error.
   * @throws {@link ErrorCode|TokenExpiredError} when SSO token has already expired.
   * @throws {@link ErrorCode|UiRequiredError} when need user consent to get access token.
   * @throws {@link ErrorCode|ServiceError} when failed to get access token from simple auth server.
   * @throws {@link ErrorCode|InvalidParameter} when scopes is not a valid string or string array.
   * @throws {@link ErrorCode|RuntimeNotSupported} when runtime is browser.
   * 
   * @returns Access token with expected scopes.
   * If scopes is empty string or array, it returns SSO token.
   * If scopes is non-empty, it returns access token for target scope.
   * Throw error if get access token failed.
   * 
   * @beta
   */
  async getToken(
    scopes: string | string[],
    options?: GetTokenOptions
  ): Promise<AccessToken | null> {
    validateScopesType(scopes);

    let scopesArray: string[] = typeof scopes === "string" ? scopes.split(" ") : scopes;
    scopesArray = scopesArray.filter((x) => x !== null && x !== "");

    let result: AccessToken | null;
    if (!scopesArray.length) {
      internalLogger.info("Get SSO token.");
      if (Math.floor(Date.now() / 1000) > this.ssoToken.expiresOnTimestamp) {
        const errorMsg = "Sso token has already expired.";
        internalLogger.error(errorMsg);
        throw new ErrorWithCode(errorMsg, ErrorCode.TokenExpiredError);
      }
      result = this.ssoToken;
    } else {
      internalLogger.info("Get access token with scopes: " + scopesArray.join(" "));

      let authenticationResult: AuthenticationResult | null;
      try {
        authenticationResult = await this.msalClient.acquireTokenOnBehalfOf({
          oboAssertion: this.ssoToken.token,
          scopes: scopesArray
        });
      } catch (error) {
        throw this.generateAuthServerError(error);
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
   * Get basic user info from SSO token.
   *
   * @example
   * ```typescript
   * const currentUser = await credential.getUserInfo();
   * ```
   * 
   * @throws {@link ErrorCode|InternalError} when SSO token is not valid.
   * @throws {@link ErrorCode|RuntimeNotSupported} when runtime is browser.
   * 
   * @returns Basic user info with user displayName, objectId and preferredUserName.
   * 
   * @beta
   */
  public getUserInfo(): Promise<UserInfo> {
    internalLogger.info("Get basic user info from SSO token");
    const userInfo = getUserInfoFromSsoToken(this.ssoToken.token);
    return new Promise<UserInfo>((resolve) => {
      resolve(userInfo);
    });
  }

  private generateAuthServerError(err: any): Error {
    const errorMessage = err.errorMessage;
    if (err.name === "InteractionRequiredAuthError") {
      const fullErrorMsg =
        "Failed to get access token from AAD server, interaction required: " + errorMessage;
      internalLogger.error(fullErrorMsg);
      return new ErrorWithCode(fullErrorMsg, ErrorCode.UiRequiredError);
    } else if (errorMessage && errorMessage.indexOf("AADSTS500133") >= 0) {
      const fullErrorMsg =
        "Failed to get access token from AAD server, sso token expired: " + errorMessage;
      internalLogger.error(fullErrorMsg);
      return new ErrorWithCode(fullErrorMsg, ErrorCode.TokenExpiredError);
    } else {
      const fullErrorMsg = formatString(
        ErrorMessage.FailToAcquireTokenOnBehalfOfUser,
        errorMessage
      );
      internalLogger.error(fullErrorMsg);
      return new ErrorWithCode(fullErrorMsg, ErrorCode.ServiceError);
    }
  }
}
