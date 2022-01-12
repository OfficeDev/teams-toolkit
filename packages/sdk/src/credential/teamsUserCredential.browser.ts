// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AccessToken, TokenCredential, GetTokenOptions } from "@azure/identity";
import { UserInfo } from "../models/userinfo";
import { ErrorCode, ErrorMessage, ErrorWithCode } from "../core/errors";
import * as microsoftTeams from "@microsoft/teams-js";
import { getAuthenticationConfiguration } from "../core/configurationProvider";
import { AuthenticationConfiguration } from "../models/configuration";
import {
  validateScopesType,
  getUserInfoFromSsoToken,
  parseJwt,
  getTenantIdAndLoginHintFromSsoToken,
  parseAccessTokenFromAuthCodeTokenResponse,
} from "../util/utils";
import { formatString } from "../util/utils";
import { internalLogger } from "../util/logger";
import { PublicClientApplication } from "@azure/msal-browser";

const tokenRefreshTimeSpanInMillisecond = 5 * 60 * 1000;
const initializeTeamsSdkTimeoutInMillisecond = 5000;
const loginPageWidth = 600;
const loginPageHeight = 535;

/**
 * Represent Teams current user's identity, and it is used within Teams tab application.
 *
 * @remarks
 * Can only be used within Teams.
 *
 * @beta
 */
export class TeamsUserCredential implements TokenCredential {
  private readonly config: AuthenticationConfiguration;
  private ssoToken: AccessToken | null;
  private initialized: boolean;
  private msalInstance?: PublicClientApplication;
  private tid?: string;
  private loginHint?: string;

  /**
   * Constructor of TeamsUserCredential.
   * Developer need to call loadConfiguration(config) before using this class.
   * 
   * @example
   * ```typescript
   * const config = {
   *  authentication: {
   *    runtimeConnectorEndpoint: "https://xxx.xxx.com",
   *    initiateLoginEndpoint: "https://localhost:3000/auth-start.html",
   *    clientId: "xxx"
   *   }
   * }
     loadConfiguration(config); // No default config from environment variables, developers must provide the config object.
     const credential = new TeamsUserCredential(["https://graph.microsoft.com/User.Read"]);
   * ```
   *
   * @throws {@link ErrorCode|InvalidConfiguration} when client id, initiate login endpoint or simple auth endpoint is not found in config.
   * @throws {@link ErrorCode|RuntimeNotSupported} when runtime is nodeJS.
   * 
   * @beta
   */
  constructor() {
    internalLogger.info("Create teams user credential");
    this.config = this.loadAndValidateConfig();
    this.ssoToken = null;
    this.initialized = false;
  }

  /**
   * Popup login page to get user's access token with specific scopes.
   *
   * @remarks
   * Only works in Teams client APP. User will be redirected to the authorization page to login and consent.
   *
   * @example
   * ```typescript
   * await credential.login(["https://graph.microsoft.com/User.Read"]); // single scope using string array
   * await credential.login("https://graph.microsoft.com/User.Read"); // single scopes using string
   * await credential.login(["https://graph.microsoft.com/User.Read", "Calendars.Read"]); // multiple scopes using string array
   * await credential.login("https://graph.microsoft.com/User.Read Calendars.Read"); // multiple scopes using string
   * ```
   * @param scopes - The list of scopes for which the token will have access, before that, we will request user to consent.
   *
   * @throws {@link ErrorCode|InternalError} when failed to login with unknown error.
   * @throws {@link ErrorCode|ServiceError} when simple auth server failed to exchange access token.
   * @throws {@link ErrorCode|ConsentFailed} when user canceled or failed to consent.
   * @throws {@link ErrorCode|InvalidParameter} when scopes is not a valid string or string array.
   * @throws {@link ErrorCode|RuntimeNotSupported} when runtime is nodeJS.
   *
   * @beta
   */
  async login(scopes: string | string[]): Promise<AccessToken | null> {
    validateScopesType(scopes);
    const scopesStr = typeof scopes === "string" ? scopes : scopes.join(" ");

    internalLogger.info(`Popup login page to get user's access token with scopes: ${scopesStr}`);

    if (!this.initialized) {
      await this.init();
    }

    return new Promise<AccessToken | null>((resolve, reject) => {
      microsoftTeams.initialize(() => {
        microsoftTeams.authentication.authenticate({
          url: `${this.config.initiateLoginEndpoint}?clientId=${
            this.config.clientId
          }&scope=${encodeURI(scopesStr)}&loginHint=${this.loginHint}`,
          width: loginPageWidth,
          height: loginPageHeight,
          successCallback: async (result?: string) => {
            if (!result) {
              const errorMsg = "Get empty authentication result from MSAL";

              internalLogger.error(errorMsg);
              reject(new ErrorWithCode(errorMsg, ErrorCode.InternalError));
              return;
            }

            try {
              const accessToken = parseAccessTokenFromAuthCodeTokenResponse(result);
              resolve(accessToken);
            } catch (error: any) {
              reject(error);
            }
          },
          failureCallback: (reason?: string) => {
            const errorMsg = `Consent failed for the scope ${scopesStr} with error: ${reason}`;
            internalLogger.error(errorMsg);
            reject(new ErrorWithCode(errorMsg, ErrorCode.ConsentFailed));
          },
        });
      });
    });
  }

  /**
   * Get access token from credential.
   *
   * Important: Access tokens are stored in sessionStorage, read more here: https://aka.ms/teamsfx-session-storage-notice
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
   * @throws {@link ErrorCode|InternalError} when failed to get access token with unknown error.
   * @throws {@link ErrorCode|UiRequiredError} when need user consent to get access token.
   * @throws {@link ErrorCode|ServiceError} when failed to get access token from simple auth server.
   * @throws {@link ErrorCode|InvalidParameter} when scopes is not a valid string or string array.
   * @throws {@link ErrorCode|RuntimeNotSupported} when runtime is nodeJS.
   *
   * @returns User access token of defined scopes.
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
    const ssoToken = await this.getSSOToken();

    const scopeStr = typeof scopes === "string" ? scopes : scopes.join(" ");
    if (scopeStr === "") {
      internalLogger.info("Get SSO token");

      return ssoToken;
    } else {
      internalLogger.info("Get access token with scopes: " + scopeStr);

      if (!this.initialized) {
        await this.init();
      }

      // Get domain from login start page. Will be used in redirect uri.
      let domain;
      try {
        domain = new URL(this.config.initiateLoginEndpoint!).origin;
      } catch (error: any) {
        const failedToParseLoginEndpoint = `Failed to parse INITIATE_LOGIN_ENDPOINT in config. Reson: ${error.message}`;
        internalLogger.error(failedToParseLoginEndpoint);
        throw new ErrorWithCode(failedToParseLoginEndpoint, ErrorCode.InternalError);
      }

      let tokenResponse;
      let errorMessage = "";
      const scopesArray = typeof scopes === "string" ? scopes.split(" ") : scopes;

      // First try to get Access Token from cache.
      try {
        const account = this.msalInstance!.getAccountByUsername(this.loginHint!);
        const scopesRequestForAcquireTokenSilent = {
          scopes: scopesArray,
          account: account ?? undefined,
          redirectUri: `${domain}/blank-auth-end.html`,
        };
        tokenResponse = await this.msalInstance!.acquireTokenSilent(
          scopesRequestForAcquireTokenSilent
        );
      } catch (error: any) {
        const acquireTokenSilentFailedMessage = `Failed to call acquireTokenSilent. Reason: ${error?.message}. `;
        errorMessage += acquireTokenSilentFailedMessage;
      }

      if (!tokenResponse) {
        // If fail to get Access Token from cache, try to get Access token by silent login.
        try {
          const scopesRequestForSsoSilent = {
            scopes: scopesArray,
            loginHint: this.loginHint,
            redirectUri: `${domain}/blank-auth-end.html`,
          };
          tokenResponse = await this.msalInstance!.ssoSilent(scopesRequestForSsoSilent);
        } catch (error: any) {
          const ssoSilentFailedMessage = `Failed to call ssoSilent. Reason: ${error?.message}. `;
          errorMessage += ssoSilentFailedMessage;
        }
      }

      if (!tokenResponse) {
        const errorMsg = `Get empty authentication result from MSAL. Error: ${errorMessage}`;
        internalLogger.error(errorMsg);
        throw new ErrorWithCode(errorMsg, ErrorCode.InternalError);
      }

      const accessToken = parseAccessTokenFromAuthCodeTokenResponse(JSON.stringify(tokenResponse));
      return accessToken;
    }
  }

  /**
   * Get basic user info from SSO token
   *
   * @example
   * ```typescript
   * const currentUser = await credential.getUserInfo();
   * ```
   *
   * @throws {@link ErrorCode|InternalError} when SSO token from Teams client is not valid.
   * @throws {@link ErrorCode|InvalidParameter} when SSO token from Teams client is empty.
   * @throws {@link ErrorCode|RuntimeNotSupported} when runtime is nodeJS.
   *
   * @returns Basic user info with user displayName, objectId and preferredUserName.
   *
   * @beta
   */
  public async getUserInfo(): Promise<UserInfo> {
    internalLogger.info("Get basic user info from SSO token");
    const ssoToken = await this.getSSOToken();
    return getUserInfoFromSsoToken(ssoToken.token);
  }

  private async init(): Promise<void> {
    microsoftTeams.initialize();

    const ssoToken = await this.getSSOToken();
    const info = getTenantIdAndLoginHintFromSsoToken(ssoToken.token);
    this.loginHint = info.loginHint;
    this.tid = info.tid;

    const msalConfig = {
      auth: {
        clientId: this.config.clientId!,
        authority: `https://login.microsoftonline.com/${this.tid}`,
      },
      cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
      },
    };

    this.msalInstance = new PublicClientApplication(msalConfig);
    this.initialized = true;
  }

  /**
   * Get SSO token using teams SDK
   * It will try to get SSO token from memory first, if SSO token doesn't exist or about to expired, then it will using teams SDK to get SSO token
   * @returns SSO token
   */
  private getSSOToken(): Promise<AccessToken> {
    return new Promise<AccessToken>((resolve, reject) => {
      if (this.ssoToken) {
        if (this.ssoToken.expiresOnTimestamp - Date.now() > tokenRefreshTimeSpanInMillisecond) {
          internalLogger.verbose("Get SSO token from memory cache");
          resolve(this.ssoToken);
          return;
        }
      }

      let initialized = false;
      microsoftTeams.initialize(() => {
        initialized = true;
        microsoftTeams.authentication.getAuthToken({
          successCallback: (token: string) => {
            if (!token) {
              const errorMsg = "Get empty SSO token from Teams";
              internalLogger.error(errorMsg);
              reject(new ErrorWithCode(errorMsg, ErrorCode.InternalError));
              return;
            }

            const tokenObject = parseJwt(token);
            if (tokenObject.ver !== "1.0" && tokenObject.ver !== "2.0") {
              const errorMsg = "SSO token is not valid with an unknown version: " + tokenObject.ver;
              internalLogger.error(errorMsg);
              reject(new ErrorWithCode(errorMsg, ErrorCode.InternalError));
              return;
            }

            const ssoToken: AccessToken = {
              token,
              expiresOnTimestamp: tokenObject.exp * 1000,
            };

            this.ssoToken = ssoToken;
            resolve(ssoToken);
          },
          failureCallback: (errMessage: string) => {
            const errorMsg = "Get SSO token failed with error: " + errMessage;
            internalLogger.error(errorMsg);
            reject(new ErrorWithCode(errorMsg, ErrorCode.InternalError));
          },
          resources: [],
        });
      });

      // If the code not running in Teams, the initialize callback function would never trigger
      setTimeout(() => {
        if (!initialized) {
          const errorMsg =
            "Initialize teams sdk timeout, maybe the code is not running inside Teams";
          internalLogger.error(errorMsg);
          reject(new ErrorWithCode(errorMsg, ErrorCode.InternalError));
        }
      }, initializeTeamsSdkTimeoutInMillisecond);
    });
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

    if (config.initiateLoginEndpoint && config.simpleAuthEndpoint && config.clientId) {
      return config;
    }

    const missingValues = [];
    if (!config.initiateLoginEndpoint) {
      missingValues.push("initiateLoginEndpoint");
    }

    if (!config.simpleAuthEndpoint) {
      missingValues.push("simpleAuthEndpoint");
    }

    if (!config.clientId) {
      missingValues.push("clientId");
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
