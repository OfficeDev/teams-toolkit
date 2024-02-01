// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TokenCredential } from "@azure/identity";
import { AppCredential } from "../credential/appCredential";
import { OnBehalfOfUserCredential } from "../credential/onBehalfOfUserCredential";
import { IdentityType } from "../models/identityType";
import { UserInfo } from "../models/userinfo";
import { formatString } from "../util/utils";
import { ErrorWithCode, ErrorCode, ErrorMessage } from "../core/errors";
import { internalLogger } from "../util/logger";
import { TeamsFxConfiguration } from "../models/teamsfxConfiguration";
import { AuthenticationConfiguration } from "../models/configuration";

// Following keys are used by SDK internally
const ReservedKey: Set<string> = new Set<string>([
  "authorityHost",
  "tenantId",
  "clientId",
  "clientSecret",
  "initiateLoginEndpoint",
  "applicationIdUri",
  "apiEndpoint",
  "apiName",
  "sqlServerEndpoint",
  "sqlUsername",
  "sqlPassword",
  "sqlDatabaseName",
  "sqlIdentityId",
]);

/**
 * A class providing credential and configuration.
 * @deprecated Please use {@link TeamsUserCredential}
 * in browser environment and {@link OnBehalfOfUserCredential} or {@link AppCredential} in NodeJS.
 */
export class TeamsFx implements TeamsFxConfiguration {
  private configuration: Map<string, string | undefined>;
  private oboUserCredential?: OnBehalfOfUserCredential;
  private appCredential?: AppCredential;
  private identityType: IdentityType;

  /**
   * Constructor of TeamsFx
   *
   * @param {IdentityType} identityType - Choose user or app identity
   * @param customConfig - key/value pairs of customized configuration that overrides default ones.
   *
   * @throws {@link ErrorCode|IdentityTypeNotSupported} when setting app identity in browser.
   */
  constructor(
    identityType?: IdentityType,
    customConfig?: Record<string, string> | AuthenticationConfiguration
  ) {
    this.identityType = identityType ?? IdentityType.User;
    this.configuration = new Map<string, string>();
    this.loadFromEnv();
    if (customConfig) {
      const myConfig: Record<string, string> = { ...customConfig };
      for (const key of Object.keys(myConfig)) {
        const value = myConfig[key];
        if (value) {
          this.configuration.set(key, value);
        }
      }
    }
  }

  /**
   * Identity type set by user.
   *
   * @returns identity type.
   */
  getIdentityType(): IdentityType {
    return this.identityType;
  }

  /**
   * Credential instance according to identity type choice.
   *
   * @remarks If user identity is chose, will return {@link TeamsUserCredential}
   * in browser environment and {@link OnBehalfOfUserCredential} in NodeJS. If app
   * identity is chose, will return {@link AppCredential}.
   *
   * @returns instance implements TokenCredential interface.
   */
  public getCredential(): TokenCredential {
    if (this.identityType === IdentityType.User) {
      if (this.oboUserCredential) {
        return this.oboUserCredential;
      }
      const errorMsg = "SSO token is required to user identity. Please use setSsoToken().";
      internalLogger.error(errorMsg);
      throw new ErrorWithCode(errorMsg, ErrorCode.InvalidParameter);
    } else {
      if (!this.appCredential) {
        this.appCredential = new AppCredential(Object.fromEntries(this.configuration));
      }
      return this.appCredential;
    }
  }

  /**
   * Get user information.
   * @param {string[]} resources - The optional list of resources for full trust Teams apps.
   * @returns UserInfo object.
   */
  public async getUserInfo(resources?: string[]): Promise<UserInfo> {
    if (this.identityType !== IdentityType.User) {
      const errorMsg = formatString(
        ErrorMessage.IdentityTypeNotSupported,
        this.identityType.toString(),
        "TeamsFx"
      );
      internalLogger.error(errorMsg);
      throw new ErrorWithCode(errorMsg, ErrorCode.IdentityTypeNotSupported);
    }
    return Promise.resolve((this.getCredential() as OnBehalfOfUserCredential).getUserInfo());
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
   * @param {string[]} resources - The optional list of resources for full trust Teams apps.
   *
   * @throws {@link ErrorCode|InternalError} when failed to login with unknown error.
   * @throws {@link ErrorCode|ConsentFailed} when user canceled or failed to consent.
   * @throws {@link ErrorCode|InvalidParameter} when scopes is not a valid string or string array.
   * @throws {@link ErrorCode|RuntimeNotSupported} when runtime is nodeJS.
   */
  public async login(scopes: string | string[], resources?: string[]): Promise<void> {
    throw new ErrorWithCode(
      formatString(ErrorMessage.NodejsRuntimeNotSupported, "login"),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * Set SSO token when using user identity in NodeJS.
   * @param {string} ssoToken - used for on behalf of user flow.
   * @returns self instance.
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
   * Usually used by service plugins to retrieve specific config
   * @param {string} key - configuration key.
   * @returns value in configuration.
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
   */
  public hasConfig(key: string): boolean {
    const value = this.configuration.get(key);
    return !!value;
  }

  /**
   * Get all configurations.
   * @returns key value mappings.
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
      if (ReservedKey.has(key)) {
        internalLogger.warn(
          `The name of environment variable ${key} is preserved. Will not load it as configuration.`
        );
      }
      this.configuration.set(key, env[key]);
    });
  }
}
