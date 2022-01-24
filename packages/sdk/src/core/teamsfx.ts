// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TokenCredential } from "@azure/identity";
import { M365TenantCredential } from "../credential/m365TenantCredential";
import { OnBehalfOfUserCredential } from "../credential/onBehalfOfUserCredential";
import { IdentityType } from "../models/identityType";
import { UserInfo } from "../models/userinfo";
import { formatString } from "../util/utils";
import { ErrorWithCode, ErrorCode, ErrorMessage } from "../core/errors";
import { internalLogger } from "../util/logger";

/**
 * A class providing credential and configuration.
 * @beta
 */
export class TeamsFx {
  private configuration: Map<string, string | undefined>;
  private oboUserCredential?: OnBehalfOfUserCredential;
  private appCredential?: M365TenantCredential;
  /**
   * Identity type set by user.
   */
  public identityType: IdentityType;

  /**
   * Constructor of TeamsFx
   *
   * @param {IdentityType} identityType - Choose user or app identity
   *
   * @throws {@link ErrorCode|IdentityTypeNotSupported} when setting app identity in browser.
   *
   * @beta
   */
  constructor(identityType?: IdentityType) {
    this.identityType = identityType ?? IdentityType.User;
    this.configuration = new Map<string, string>();
    this.loadFromEnv();
  }

  /**
   * Credential instance according to identity type choice.
   *
   * @remarks If user identity is chose, will return {@link TeamsUserCredential}
   * in browser environment and {@link OnBehalfOfUserCredential} in NodeJS. If app
   * identity is chose, will return {@link M365TenantCredential}.
   *
   * @returns instance implements TokenCredential interface.
   * @beta
   */
  public get Credential(): TokenCredential {
    if (this.identityType === IdentityType.User) {
      if (this.oboUserCredential) {
        return this.oboUserCredential;
      }
      throw new Error();
    } else {
      if (!this.appCredential) {
        this.appCredential = new M365TenantCredential(Object.fromEntries(this.configuration));
      }
      return this.appCredential;
    }
  }

  /**
   * Get user information.
   * @returns UserInfo object.
   * @beta
   */
  public async getUserInfo(): Promise<UserInfo> {
    if (this.identityType !== IdentityType.User) {
      const errorMsg = formatString(
        ErrorMessage.IdentityTypeNotSupported,
        this.identityType.toString(),
        "TeamsFx"
      );
      internalLogger.error(errorMsg);
      throw new ErrorWithCode(errorMsg, ErrorCode.IdentityTypeNotSupported);
    }
    return Promise.resolve((this.Credential as OnBehalfOfUserCredential).getUserInfo());
  }

  /**
   * Popup login page to get user's access token with specific scopes.
   *
   * @remarks
   * Only works in Teams client APP. User will be redirected to the authorization page to login and consent.
   *
   * @example
   * ```typescript
   * await teamsfx.login(["https://graph.microsoft.com/User.Read"]); // single scope using string array
   * await teamsfx.login("https://graph.microsoft.com/User.Read"); // single scopes using string
   * await teamsfx.login(["https://graph.microsoft.com/User.Read", "Calendars.Read"]); // multiple scopes using string array
   * await teamsfx.login("https://graph.microsoft.com/User.Read Calendars.Read"); // multiple scopes using string
   * ```
   * @param scopes - The list of scopes for which the token will have access, before that, we will request user to consent.
   *
   * @throws {@link ErrorCode|InternalError} when failed to login with unknown error.
   * @throws {@link ErrorCode|ConsentFailed} when user canceled or failed to consent.
   * @throws {@link ErrorCode|InvalidParameter} when scopes is not a valid string or string array.
   * @throws {@link ErrorCode|RuntimeNotSupported} when runtime is nodeJS.
   *
   * @beta
   */
  public async login(scopes: string | string[]): Promise<void> {
    throw new ErrorWithCode(
      formatString(ErrorMessage.NodejsRuntimeNotSupported, "login"),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * Set SSO token when using user identity in NodeJS.
   * @param {string} ssoToken - used for on behalf of user flow.
   * @returns self instance.
   * @beta
   */
  public setSsoToken(ssoToken: string): TeamsFx {
    if (this.identityType !== IdentityType.User) {
      throw new Error();
    }
    this.oboUserCredential = new OnBehalfOfUserCredential(
      ssoToken,
      Object.fromEntries(this.configuration)
    );
    return this;
  }

  /**
   * Set customized configuration to override default values.
   * @param customConfig - key/value pairs.
   * @returns this instance.
   * @beta
   */
  public setCustomConfig(customConfig: Record<string, string>): TeamsFx {
    for (const key of Object.keys(customConfig)) {
      const value = customConfig[key];
      if (value) {
        this.configuration.set(key, value);
      }
    }
    this.oboUserCredential = undefined;
    this.appCredential = undefined;
    return this;
  }

  /**
   * Usually used by service plugins to retrieve specific config
   * @param {string} key - configuration key.
   * @returns value in configuration.
   * @beta
   */
  public getConfig(key: string): string {
    const value = this.configuration.get(key);
    if (!value) {
      const errorMsg = `Cannot find ${key} in configuration`;
      internalLogger.error(errorMsg);
      throw new ErrorWithCode(errorMsg, ErrorCode.InternalError);
    }
    return value;
  }

  /**
   * Check the value of specific key.
   * @param {string} key - configuration key.
   * @returns true if corresponding value is not empty string.
   * @beta
   */
  public hasConfig(key: string): boolean {
    const value = this.configuration.get(key);
    return !!value;
  }

  /**
   * Get all configurations.
   * @returns key value mappings.
   * @beta
   */
  public getConfigs(): Record<string, string> {
    const config: Record<string, string> = {};
    for (const key of this.configuration.keys()) {
      const value = this.configuration.get(key);
      if (value) {
        config[key] = value;
      }
    }
    return config;
  }

  /**
   * Load configuration from environment variables.
   */
  private loadFromEnv(): void {
    const env = process.env;
    this.configuration.set("authorityHost", env.M365_AUTHORITY_HOST);
    this.configuration.set("tenantId", env.M365_TENANT_ID);
    this.configuration.set("clientId", env.M365_CLIENT_ID);
    this.configuration.set("clientSecret", env.M365_CLIENT_SECRET);
    this.configuration.set("initiateLoginEndpoint", env.INITIATE_LOGIN_ENDPOINT);
    this.configuration.set("applicationIdUri", env.M365_APPLICATION_ID_URI);
    this.configuration.set("apiEndpoint", env.API_ENDPOINT);
    this.configuration.set("apiName", env.API_NAME);
    this.configuration.set("sqlServerEndpoint", env.SQL_ENDPOINT);
    this.configuration.set("sqlUsername", env.SQL_USER_NAME);
    this.configuration.set("sqlPassword", env.SQL_PASSWORD);
    this.configuration.set("sqlDatabaseName", env.SQL_DATABASE_NAME);
    this.configuration.set("sqlIdentityId", env.IDENTITY_ID);

    Object.keys(env).forEach((key: string) => {
      const value = env[key];
      if (key.startsWith("TEAMSFX_") && value) {
        this.configuration.set(key.substring(8), value);
      }
    });
  }
}
