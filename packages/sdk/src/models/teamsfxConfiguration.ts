// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TokenCredential } from "@azure/identity";
import { IdentityType, UserInfo } from "..";

/**
 * TeamsFx interface that provides credential and configuration.
 * @beta
 */
export interface TeamsFxConfiguration {
  /**
   * Identity type set by user.
   */
  identityType: IdentityType;

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
  get Credential(): TokenCredential;

  /**
   * Get user information.
   * @returns UserInfo object.
   * @beta
   */
  getUserInfo(): Promise<UserInfo>;

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
  login(scopes: string | string[]): Promise<void>;

  /**
   * Set SSO token when using user identity in NodeJS.
   * @param {string} ssoToken - used for on behalf of user flow.
   * @returns self instance.
   * @beta
   */
  setSsoToken(ssoToken: string): TeamsFxConfiguration;

  /**
   * Set customized configuration to override default values.
   * @param customConfig - key/value pairs.
   * @returns this instance.
   * @beta
   */
  setCustomConfig(customConfig: Record<string, string>): TeamsFxConfiguration;

  /**
   * Usually used by service plugins to retrieve specific config
   * @param {string} key - configuration key.
   * @returns value in configuration.
   * @beta
   */
  getConfig(key: string): string;

  /**
   * Check the value of specific key.
   * @param {string} key - configuration key.
   * @returns true if corresponding value is not empty string.
   * @beta
   */
  hasConfig(key: string): boolean;

  /**
   * Get all configurations.
   * @returns key value mappings.
   * @beta
   */
  getConfigs(): Record<string, string>;
}
