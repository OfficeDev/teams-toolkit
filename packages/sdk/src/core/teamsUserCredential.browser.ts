// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AccessToken, TokenCredential, GetTokenOptions } from "@azure/identity";
import { UserInfo } from "../models/userinfo";
import { ErrorCode, ErrorMessage, ErrorWithCode } from "./errors";
import { Cache } from "./cache.browser";
import * as microsoftTeams from "@microsoft/teams-js";
import { getAuthenticationConfiguration } from "./configurationProvider";
import { AuthenticationConfiguration } from "../models/configuration";
import { AuthCodeResult } from "../models/authCodeResult";
import axios, { AxiosInstance } from "axios";
import { GrantType } from "../models/grantType";
import { AccessTokenResult } from "../models/accessTokenResult";
import { getUserInfoFromSsoToken, parseJwt } from "../util/utils";
import { formatString } from "../util/utils";
import { internalLogger } from "../util/logger";

const accessTokenCacheKeyPrefix = "accessToken";
const separator = "-";
const tokenRefreshTimeSpanInMillisecond = 5 * 60 * 1000;
const getSSOTokenTimeoutInMillisecond = 8000;
const loginPageWidth = 600;
const loginPageHeight = 535;
const maxRetryCount = 3;
const retryTimeSpanInMillisecond = 3000;

/**
 * Used within Teams client applications.
 *
 * @remarks
 * User can interactively login and consent within Teams.
 *
 * @beta
 */
export class TeamsUserCredential implements TokenCredential {
  private readonly config: AuthenticationConfiguration;
  private ssoToken: AccessToken | null;

  /**
   * Constructor of TeamsUserCredential
   * Developer need call loadConfiguration(config) before using this class
   * @example
   * ```
   * var config = {
   *  authentication: {
   *    runtimeConnectorEndpoint: "https://xxx.xxx.com",
   *    initiateLoginEndpoint: "auth-start.html"
   *    clientId: "xxx"
   *   }
   * }
     loadConfiguration(config); // No default config from environment variables, developers must provide the config object.
     var credential = new TeamsUserCredential();
   * ```
   * @throws {InvalidConfiguration}
   * 
   */
  constructor() {
    internalLogger.info("Create teams user credential");
    this.config = this.loadAndValidateConfig();
    this.ssoToken = null;
  }

  /**
   * Popup login page to get user's access token, will throw {@link ErrorWithCode} if failed.
   *
   * @remarks Only works in Teams client app. User will be redirected to the authorization page to login and consent.
   * The access token would be managed by the SDK and cached in the localStorage.
   *
   * @example
   * ```typescript
   * await credential.login(["User.Read"]);
   * ```
   * @param scopes - The array of Microsoft Token scope of access. Default value is  `[.default]`. Scopes provide a way to manage permissions to protected resources.
   *
   * @throws {InternalError}
   * @throws {ServiceError}
   * @throws {ConsentFailed}
   */
  public async login(scopes: string | string[]): Promise<void> {
    const scopesStr = typeof scopes === "string" ? scopes : scopes.join(" ");

    internalLogger.info(`Popup login page to get user's access token with scopes: ${scopesStr}`);

    return new Promise<void>((resolve, reject) => {
      microsoftTeams.initialize(() => {
        microsoftTeams.authentication.authenticate({
          url: `${this.config.initiateLoginEndpoint}?clientId=${this.config.clientId
            }&scope=${encodeURI(scopesStr)}`,
          width: loginPageWidth,
          height: loginPageHeight,
          successCallback: async (result?: string) => {
            if (!result) {
              const errorMsg = "Get empty authentication result from Teams";

              internalLogger.error(errorMsg);
              reject(new ErrorWithCode(errorMsg, ErrorCode.InternalError));
              return;
            }

            const authCodeResult: AuthCodeResult = JSON.parse(result);
            try {
              await this.exchangeAccessTokenFromSimpleAuthServer(scopesStr, authCodeResult);
              resolve();
            } catch (err) {
              reject(this.generateAuthServerError(err));
            }
          },
          failureCallback: (reason?: string) => {
            const errorMsg = `Consent failed for the scope ${scopesStr} with error: ${reason}`;
            internalLogger.error(errorMsg);
            reject(new ErrorWithCode(errorMsg, ErrorCode.ConsentFailed));
          }
        });
      });
    });
  }

  /**
   * Get access token from credential
   *
   * @example
   * ```typescript
   * await credential.getToken([]) // Get SSO token
   * await credential.getToken("") // Get SSO token
   * await credential.getToken(["User.Read"]) // Get Graph access token
   * await credential.getToken("User.Read") // Get Graph access token
   * await credential.getToken(["User.Read", "Application.Read.All"]) // Get Graph access token for multiple scopes
   * await credential.getToken([".default"]) // Get Graph access token with default scope
   * await credential.getToken(".default") // Get Graph access token with default scope
   * await credential.getToken(["https://outlook.office.com/mail.read"]) // Get Outlook access token
   * ```
   *
   * @param {string | string[]} scopes - The list of scopes for which the token will have access.
   * @param {GetTokenOptions} options - The options used to configure any requests this TokenCredential implementation might make.
   *
   * @throws {InternalError}
   * @throws {UiRequiredError}
   * @throws {ServiceError}
   *
   * @returns user access token of defined scopes.
   * If scopes is empty string or array, it returns SSO token.
   * If scopes is non-empty, it returns access token for target scope.
   * Throw error if get access token failed.
   */
  async getToken(
    scopes: string | string[],
    options?: GetTokenOptions
  ): Promise<AccessToken | null> {
    // TODO apply get token options
    const ssoToken = await this.getSSOToken();

    const scopeStr = typeof scopes === "string" ? scopes : scopes.join(" ");
    if (scopeStr === "") {
      internalLogger.info("Get SSO token");

      return ssoToken;
    } else {
      internalLogger.info("Get access token with scopes: " + scopeStr);
      const cachedKey = await this.getAccessTokenCacheKey(scopeStr);
      const cachedToken = this.getTokenCache(cachedKey);

      if (cachedToken) {
        if (!this.isAccessTokenNearExpired(cachedToken)) {
          internalLogger.verbose("Get access token from cache");
          return cachedToken;
        } else {
          internalLogger.verbose("Cached access token is expired");
        }
      } else {
        internalLogger.verbose("No cached access token");
      }

      const accessToken = await this.getAndCacheAccessTokenFromSimpleAuthServer(scopeStr);
      return accessToken;
    }
  }

  /**
   * Get the user info from SSO token
   *
   * @example
   * Get basic user info from SSO token
   * ```typescript
   * const currentUser = await credential.getUserInfo();
   * ```
   * @throws {InternalError}
   * @throws {InvalidParameter}
   *
   * @returns UserInfo with user displayName, objectId and preferredUserName.
   */
  public async getUserInfo(): Promise<UserInfo> {
    internalLogger.info("Get basic user info from SSO token");
    const ssoToken = await this.getSSOToken();
    return getUserInfoFromSsoToken(ssoToken.token);
  }

  private async exchangeAccessTokenFromSimpleAuthServer(
    scopesStr: string,
    authCodeResult: AuthCodeResult
  ): Promise<void> {
    const axiosInstance: AxiosInstance = await this.getAxiosInstance();

    let retryCount = 0;
    while (true) {
      try {
        const response = await axiosInstance.post("/auth/token", {
          scope: scopesStr,
          code: authCodeResult.code,
          code_verifier: authCodeResult.codeVerifier,
          redirect_uri: authCodeResult.redirectUri,
          grant_type: GrantType.authCode
        });

        const tokenResult: AccessTokenResult = response.data;
        const key = await this.getAccessTokenCacheKey(scopesStr);
        this.setTokenCache(key, {
          token: tokenResult.access_token,
          expiresOnTimestamp: tokenResult.expires_on
        });
        return;
      } catch (err) {
        if (err.response?.data?.type && err.response.data.type === "AadUiRequiredException") {
          internalLogger.warn("Exchange access token failed, retry...");
          if (retryCount < maxRetryCount) {
            await this.sleep(retryTimeSpanInMillisecond);
            retryCount++;
            continue;
          }
        }
        throw err;
      }
    }
  }

  /**
   * Get access token cache from authentication server
   * @returns access token
   */
  private async getAndCacheAccessTokenFromSimpleAuthServer(
    scopesStr: string
  ): Promise<AccessToken> {
    try {
      internalLogger.verbose(
        "Get access token from authentication server with scopes: " + scopesStr
      );
      const axiosInstance: AxiosInstance = await this.getAxiosInstance();
      const response = await axiosInstance.post("/auth/token", {
        scope: scopesStr,
        grant_type: GrantType.ssoToken
      });

      const accessTokenResult: AccessTokenResult = response.data;
      const accessToken: AccessToken = {
        token: accessTokenResult.access_token,
        expiresOnTimestamp: accessTokenResult.expires_on
      };
      const cacheKey = await this.getAccessTokenCacheKey(scopesStr);
      this.setTokenCache(cacheKey, accessToken);
      return accessToken;
    } catch (err) {
      throw this.generateAuthServerError(err);
    }
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

      let alreadyProcessed = false;
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
              const errorMsg = "SSO token is not valid with an unknown version: " + tokenObject.ver;
              internalLogger.error(errorMsg);
              reject(new ErrorWithCode(errorMsg, ErrorCode.InternalError));
              return;
            }

            const ssoToken: AccessToken = {
              token,
              expiresOnTimestamp: tokenObject.exp * 1000
            };

            this.ssoToken = ssoToken;
            alreadyProcessed = true;
            resolve(ssoToken);
          },
          failureCallback: (errMessage: string) => {
            alreadyProcessed = true;
            const errorMsg = "Get SSO token failed with error: " + errMessage;
            internalLogger.error(errorMsg);
            reject(new ErrorWithCode(errorMsg, ErrorCode.InternalError));
          },
          resources: []
        });

        setTimeout(() => {
          if (!alreadyProcessed) {
            const errorMsg = "Get SSO token timeout, maybe the code is not running inside Teams";
            internalLogger.error(errorMsg);
            reject(new ErrorWithCode(errorMsg, ErrorCode.InternalError));
          }
        }, getSSOTokenTimeoutInMillisecond);
      });
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

  /**
   * Get axios instance with sso token bearer header
   * @returns AxiosInstance
   */
  private async getAxiosInstance(): Promise<AxiosInstance> {
    const ssoToken = await this.getSSOToken();
    const axiosInstance: AxiosInstance = axios.create({
      baseURL: this.config.simpleAuthEndpoint
    });

    axiosInstance.interceptors.request.use((config) => {
      config.headers.Authorization = "Bearer " + ssoToken.token;
      return config;
    });

    return axiosInstance;
  }

  /**
   * Set access token to cache
   * @param key
   * @param token
   */
  private setTokenCache(key: string, token: AccessToken): void {
    Cache.set(key, JSON.stringify(token));
  }

  /**
   * Get access token from cache.
   * If there is no cache or cannot be parsed, then it will return null
   * @param key
   * @returns Access token or null
   */
  private getTokenCache(key: string): AccessToken | null {
    const value = Cache.get(key);
    if (value === null) {
      return null;
    }

    const accessToken: AccessToken | null = this.validateAndParseJson(value);
    return accessToken;
  }

  /**
   * Parses passed value as JSON access token, if value is not a valid json string JSON.parse() will throw an error.
   * @param jsonValue
   */
  private validateAndParseJson(jsonValue: string): AccessToken | null {
    try {
      const parsedJson = JSON.parse(jsonValue);
      /**
       * There are edge cases in which JSON.parse will successfully parse a non-valid JSON object
       * (e.g. JSON.parse will parse an escaped string into an unescaped string), so adding a type check
       * of the parsed value is necessary in order to be certain that the string represents a valid JSON object.
       *
       */
      return parsedJson && typeof parsedJson === "object" ? parsedJson : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate cache key
   * @param scopesStr
   * @returns Access token cache key, a key example: accessToken-userId-clientId-tenantId-scopes
   */
  private async getAccessTokenCacheKey(scopesStr: string): Promise<string> {
    const ssoToken = await this.getSSOToken();
    const ssoTokenObj = parseJwt(ssoToken.token);

    const clientId = this.config.clientId;
    const userObjectId = ssoTokenObj.oid;
    const tenantId = ssoTokenObj.tid;

    const key = [accessTokenCacheKeyPrefix, userObjectId, clientId, tenantId, scopesStr]
      .join(separator)
      .replace(/" "/g, "_");
    return key;
  }

  /**
   * Check whether the token is about to expire (within 5 minutes)
   * @returns Boolean value indicate whether the token is about to expire
   */
  private isAccessTokenNearExpired(token: AccessToken): boolean {
    const expireDate = new Date(token.expiresOnTimestamp);
    if (expireDate.getTime() - Date.now() > tokenRefreshTimeSpanInMillisecond) {
      return false;
    }
    return true;
  }

  private generateAuthServerError(err: any): Error {
    let errorMessage = err.message;
    if (err.response?.data?.type) {
      errorMessage = err.response.data.detail;
      if (err.response.data.type === "AadUiRequiredException") {
        const fullErrorMsg =
          "Failed to get access token from authentication server, please login first: " +
          errorMessage;
        internalLogger.error(fullErrorMsg);
        return new ErrorWithCode(fullErrorMsg, ErrorCode.UiRequiredError);
      } else {
        const fullErrorMsg =
          "Failed to get access token from authentication server: " + errorMessage;
        internalLogger.error(fullErrorMsg);
        return new ErrorWithCode(fullErrorMsg, ErrorCode.ServiceError);
      }
    }

    const fullErrorMsg = "Failed to get access token with error: " + errorMessage;
    return new ErrorWithCode(fullErrorMsg, ErrorCode.InternalError);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
