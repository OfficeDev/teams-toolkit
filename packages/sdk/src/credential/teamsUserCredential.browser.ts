// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AccessToken, TokenCredential, GetTokenOptions } from "@azure/identity";
import { UserInfo } from "../models/userinfo";
import { ErrorCode, ErrorMessage, ErrorWithCode } from "../core/errors";
import * as microsoftTeams from "@microsoft/teams-js";
import { AuthenticationConfiguration } from "../models/configuration";
import {
  validateScopesType,
  getUserInfoFromSsoToken,
  parseJwt,
  formatString,
  getTenantIdAndLoginHintFromSsoToken,
  parseAccessTokenFromAuthCodeTokenResponse,
} from "../util/utils";
import { internalLogger } from "../util/logger";
import { PublicClientApplication } from "@azure/msal-browser";

const tokenRefreshTimeSpanInMillisecond = 5 * 60 * 1000;
const loginPageWidth = 600;
const loginPageHeight = 535;

/**
 * Represent Teams current user's identity, and it is used within Teams tab application.
 *
 * @remarks
 * Can only be used within Teams.
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
   *
   * @example
   * ```typescript
   * const config = {
   *  authentication: {
   *    initiateLoginEndpoint: "https://localhost:3000/auth-start.html",
   *    clientId: "xxx"
   *   }
   * }
   * // Use default configuration provided by Teams Toolkit
   * const credential = new TeamsUserCredential();
   * // Use a customized configuration
   * const anotherCredential = new TeamsUserCredential(config);
   * ```
   *
   * @param {AuthenticationConfiguration} authConfig - The authentication configuration. Use environment variables if not provided.
   *
   * @throws {@link ErrorCode|InvalidConfiguration} when client id, initiate login endpoint or simple auth endpoint is not found in config.
   * @throws {@link ErrorCode|RuntimeNotSupported} when runtime is nodeJS.
   */
  constructor(authConfig: AuthenticationConfiguration) {
    internalLogger.info("Create teams user credential");
    this.config = this.loadAndValidateConfig(authConfig);
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
   * @throws {@link ErrorCode|ConsentFailed} when user canceled or failed to consent.
   * @throws {@link ErrorCode|InvalidParameter} when scopes is not a valid string or string array.
   * @throws {@link ErrorCode|RuntimeNotSupported} when runtime is nodeJS.
   */
  async login(scopes: string | string[]): Promise<void> {
    validateScopesType(scopes);
    const scopesStr = typeof scopes === "string" ? scopes : scopes.join(" ");

    internalLogger.info(`Popup login page to get user's access token with scopes: ${scopesStr}`);

    if (!this.initialized) {
      await this.init();
    }

    return new Promise<void>((resolve, reject) => {
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

            let resultJson: any = {};
            try {
              resultJson = typeof result == "string" ? JSON.parse(result) : result;
            } catch (error) {
              // If can not parse result as Json, will throw error.
              const failedToParseResult = "Failed to parse response to Json.";
              internalLogger.error(failedToParseResult);
              reject(new ErrorWithCode(failedToParseResult, ErrorCode.InvalidResponse));
            }

            // If code exists in result, user may using previous auth-start and auth-end page.
            if (resultJson.code) {
              const helpLink = "https://aka.ms/teamsfx-auth-code-flow";
              const usingPreviousAuthPage =
                "Found auth code in response. Auth code is not support for current version of SDK. " +
                `Please refer to the help link for how to fix the issue: ${helpLink}.`;
              internalLogger.error(usingPreviousAuthPage);
              reject(new ErrorWithCode(usingPreviousAuthPage, ErrorCode.InvalidResponse));
            }

            // If sessionStorage exists in result, set the values in current session storage.
            if (resultJson.sessionStorage) {
              this.setSessionStorage(resultJson.sessionStorage);
            }

            resolve();
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
   * @throws {@link ErrorCode|InvalidParameter} when scopes is not a valid string or string array.
   * @throws {@link ErrorCode|RuntimeNotSupported} when runtime is nodeJS.
   *
   * @returns User access token of defined scopes.
   * If scopes is empty string or array, it returns SSO token.
   * If scopes is non-empty, it returns access token for target scope.
   * Throw error if get access token failed.
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

      let tokenResponse;
      const scopesArray = typeof scopes === "string" ? scopes.split(" ") : scopes;
      const domain = window.location.origin;

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
        internalLogger.verbose(acquireTokenSilentFailedMessage);
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
          internalLogger.verbose(ssoSilentFailedMessage);
        }
      }

      if (!tokenResponse) {
        const errorMsg = `Failed to get access token cache silently, please login first: you need login first before get access token.`;
        internalLogger.error(errorMsg);
        throw new ErrorWithCode(errorMsg, ErrorCode.UiRequiredError);
      }

      const accessToken = parseAccessTokenFromAuthCodeTokenResponse(tokenResponse);
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
   */
  public async getUserInfo(): Promise<UserInfo> {
    internalLogger.info("Get basic user info from SSO token");
    const ssoToken = await this.getSSOToken();
    return getUserInfoFromSsoToken(ssoToken.token);
  }

  private async init(): Promise<void> {
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

      if (this.checkInTeams()) {
        microsoftTeams.initialize(() => {
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
                const errorMsg =
                  "SSO token is not valid with an unknown version: " + tokenObject.ver;
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
      } else {
        const errorMsg = "Initialize teams sdk failed due to not running inside Teams";
        internalLogger.error(errorMsg);
        reject(new ErrorWithCode(errorMsg, ErrorCode.InternalError));
      }
    });
  }

  /**
   * Load and validate authentication configuration
   *
   * @param {AuthenticationConfiguration?} config - The authentication configuration. Use environment variables if not provided.
   *
   * @returns Authentication configuration
   */
  private loadAndValidateConfig(config: AuthenticationConfiguration): AuthenticationConfiguration {
    internalLogger.verbose("Validate authentication configuration");
    if (config.initiateLoginEndpoint && config.clientId) {
      return config;
    }

    const missingValues = [];
    if (!config.initiateLoginEndpoint) {
      missingValues.push("initiateLoginEndpoint");
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

  private setSessionStorage(sessionStorageValues: any): void {
    try {
      const sessionStorageKeys = Object.keys(sessionStorageValues);
      sessionStorageKeys.forEach((key) => {
        sessionStorage.setItem(key, sessionStorageValues[key]);
      });
    } catch (error: any) {
      // Values in result.sessionStorage can not be set into session storage.
      // Throw error since this may block user.
      const errorMessage = `Failed to set values in session storage. Error: ${error.message}`;
      internalLogger.error(errorMessage);
      throw new ErrorWithCode(errorMessage, ErrorCode.InternalError);
    }
  }

  // Come from here: https://github.com/wictorwilen/msteams-react-base-component/blob/master/src/useTeams.ts
  private checkInTeams(): boolean {
    if (
      (window.parent === window.self && (window as any).nativeInterface) ||
      window.navigator.userAgent.includes("Teams/") ||
      window.name === "embedded-page-container" ||
      window.name === "extension-tab-frame"
    ) {
      return true;
    }
    return false;
  }
}
