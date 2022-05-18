// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { TokenCredential } from "@azure/core-http";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import { Result } from "neverthrow";
import { FxError } from "../error";

/**
 * Difference between getAccountCredential and getIdentityCredential [Node Azure Authenticate](https://docs.microsoft.com/en-us/azure/developer/javascript/core/node-sdk-azure-authenticate)
 * You can search at [Azure JS SDK](https://docs.microsoft.com/en-us/javascript/api/overview/azure/?view=azure-node-latest) to see which credential you need.
 */
export interface AzureAccountProvider {
  /**
   * Async get ms-rest-* [credential](https://github.com/Azure/ms-rest-nodeauth/blob/master/lib/credentials/tokenCredentialsBase.ts)
   * On login failure or user cancellation, it will throw an exception instead of returning undefined. This method never returns undefined.
   * @param showDialog Control whether the UI layer displays pop-up windows.
   * @param tenantId Tenant or directory id
   */
  getAccountCredentialAsync(
    showDialog?: boolean,
    tenantId?: string
  ): Promise<TokenCredentialsBase | undefined>;
  /**
   * Async get identity [crendential](https://github.com/Azure/azure-sdk-for-js/blob/master/sdk/core/core-auth/src/tokenCredential.ts)
   * @param showDialog Control whether the UI layer displays pop-up windows.
   */
  getIdentityCredentialAsync(showDialog?: boolean): Promise<TokenCredential | undefined>;

  /**
   * Azure sign out
   */
  signout(): Promise<boolean>;

  /**
   * Add update account info callback
   * @param name callback name
   * @param statusChange callback method
   * @param immediateCall whether callback when register, the default value is true
   */
  setStatusChangeMap(
    name: string,
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>,
    immediateCall?: boolean
  ): Promise<boolean>;

  /**
   * Remove update account info callback
   * @param name callback name
   */
  removeStatusChangeMap(name: string): Promise<boolean>;

  /**
   * Get Azure token JSON object
   * - tid : tenantId
   * - unique_name : user name
   * - ...
   * @param showDialog Control whether the UI layer displays pop-up windows
   */
  getJsonObject(showDialog?: boolean): Promise<Record<string, unknown> | undefined>;

  /**
   * List subscription detail
   */
  listSubscriptions(): Promise<SubscriptionInfo[]>;

  /**
   * Set subscription id to memory
   * @param subscriptionId user used subscription id
   */
  setSubscription(subscriptionId: string): Promise<void>;

  /**
   * Get account information
   */
  getAccountInfo(): Record<string, string> | undefined;

  /**
   * Get user select subscription, tenant information
   * @param triggerUI whether means trigger login or select subscription workflow when user has not logged in or selected subscription
   * @returns SubscriptionInfo.subscriptionId === "", means user does not select subscription
   */
  getSelectedSubscription(triggerUI?: boolean): Promise<SubscriptionInfo | undefined>;
}

/**
 * Provide team accessToken
 *
 * @deprecated The method should not be used, please update to M365TokenProvider
 */
export interface AppStudioTokenProvider {
  /**
   * Get team access token
   * @param showDialog Control whether the UI layer displays pop-up windows
   */
  getAccessToken(showDialog?: boolean): Promise<string | undefined>;

  /**
   * Get app studio token JSON object
   * - tid : tenantId
   * - unique_name : user name
   * - ...
   * @param showDialog Control whether the UI layer displays pop-up windows
   */
  getJsonObject(showDialog?: boolean): Promise<Record<string, unknown> | undefined>;

  /**
   * App studio sign out
   */
  signout(): Promise<boolean>;

  /**
   * Add update account info callback
   * @param name callback name
   * @param statusChange callback method
   * @param immediateCall whether callback when register, the default value is true
   */
  setStatusChangeMap(
    name: string,
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>,
    immediateCall?: boolean
  ): Promise<boolean>;

  /**
   * Remove update account info callback
   * @param name callback name
   */
  removeStatusChangeMap(name: string): Promise<boolean>;
}

/**
 * Provide graph accessToken and JSON object
 *
 * @deprecated The method should not be used, please update to M365TokenProvider
 */
export interface GraphTokenProvider {
  /**
   * Get graph access token
   * @param showDialog Control whether the UI layer displays pop-up windows.
   */
  getAccessToken(showDialog?: boolean): Promise<string | undefined>;

  /**
   * Get graph access token JSON object
   * - tid : tenantId
   * - unique_name : user name
   * - ...
   * @param showDialog Control whether the UI layer displays pop-up windows.
   */
  getJsonObject(showDialog?: boolean): Promise<Record<string, unknown> | undefined>;

  /**
   * Graph sign out
   */
  signout(): Promise<boolean>;

  /**
   * Add update account info callback
   * @param name callback name
   * @param statusChange callback method
   * @param immediateCall whether callback when register, the default value is true
   */
  setStatusChangeMap(
    name: string,
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>,
    immediateCall?: boolean
  ): Promise<boolean>;

  /**
   * Remove update account info callback
   * @param name callback name
   */
  removeStatusChangeMap(name: string): Promise<boolean>;
}

/**
 * Provide sharepoint accessToken and JSON object
 *
 * @deprecated The method should not be used, please update to M365TokenProvider
 */
export interface SharepointTokenProvider {
  /**
   * Get sharepoint access token
   * @param showDialog Control whether the UI layer displays pop-up windows
   */
  getAccessToken(showDialog?: boolean): Promise<string | undefined>;

  /**
   * Get sharepoint token JSON object
   * - tid : tenantId
   * - unique_name : user name
   * - ...
   * @param showDialog Control whether the UI layer displays pop-up windows
   */
  getJsonObject(showDialog?: boolean): Promise<Record<string, unknown> | undefined>;

  /**
   * Add update account info callback
   * @param name callback name
   * @param statusChange callback method
   * @param immediateCall whether callback when register, the default value is true
   */
  setStatusChangeMap(
    name: string,
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>,
    immediateCall?: boolean
  ): Promise<boolean>;

  /**
   * Remove update account info callback
   * @param name callback name
   */
  removeStatusChangeMap(name: string): Promise<boolean>;
}

export type SubscriptionInfo = {
  subscriptionName: string;
  subscriptionId: string;
  tenantId: string;
};

export declare type TokenRequest = {
  scopes: Array<string>;
  showDialog?: boolean;
};
export type LoginStatus = {
  status: string;
  token?: string;
  accountInfo?: Record<string, unknown>;
};
export interface M365TokenProvider {
  getAccessToken(tokenRequest: TokenRequest): Promise<Result<string, FxError>>;
  getJsonObject(tokenRequest: TokenRequest): Promise<Result<Record<string, unknown>, FxError>>;
  getStatus(tokenRequest: TokenRequest): Promise<Result<LoginStatus, FxError>>;
  setStatusChangeMap(
    name: string,
    tokenRequest: TokenRequest,
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>,
    immediateCall?: boolean
  ): Promise<Result<boolean, FxError>>;
  removeStatusChangeMap(name: string): Promise<Result<boolean, FxError>>;
}

export type TokenProvider = {
  azureAccountProvider: AzureAccountProvider;
  /**
   * @deprecated The method should not be used, please update to M365TokenProvider
   */
  graphTokenProvider: GraphTokenProvider;
  /**
   * @deprecated The method should not be used, please update to M365TokenProvider
   */
  appStudioToken: AppStudioTokenProvider;
  /**
   * @deprecated The method should not be used, please update to M365TokenProvider
   */
  sharepointTokenProvider: SharepointTokenProvider;
  m365TokenProvider: M365TokenProvider;
};
