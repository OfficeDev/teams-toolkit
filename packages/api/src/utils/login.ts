// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { TokenCredential } from "@azure/core-http";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";

/**
 * Difference between getAccountCredential and getIdentityCredential [Node Azure Authenticate](https://docs.microsoft.com/en-us/azure/developer/javascript/core/node-sdk-azure-authenticate)
 * You can search at [Azure JS SDK](https://docs.microsoft.com/en-us/javascript/api/overview/azure/?view=azure-node-latest) to see which credential you need.
 */
export interface AzureAccountProvider {
    /**
     * @deprecated
     * Get ms-rest-* [credential](https://github.com/Azure/ms-rest-nodeauth/blob/master/lib/credentials/tokenCredentialsBase.ts)
     * @param showDialog Control whether the UI layer displays pop-up windows.
     */
    getAccountCredential(showDialog?: boolean): TokenCredentialsBase | undefined;
    /**
     * @deprecated
     * Get identity [crendential](https://github.com/Azure/azure-sdk-for-js/blob/master/sdk/core/core-auth/src/tokenCredential.ts)
     * @param showDialog Control whether the UI layer displays pop-up windows.
     */
    getIdentityCredential(showDialog?: boolean): TokenCredential | undefined;
    /**
     * Async get ms-rest-* [credential](https://github.com/Azure/ms-rest-nodeauth/blob/master/lib/credentials/tokenCredentialsBase.ts)
     * @param showDialog Control whether the UI layer displays pop-up windows.
     */
    getAccountCredentialAsync(showDialog?: boolean): Promise<TokenCredentialsBase | undefined>;
    /**
     * Async get identity [crendential](https://github.com/Azure/azure-sdk-for-js/blob/master/sdk/core/core-auth/src/tokenCredential.ts)
     * @param showDialog Control whether the UI layer displays pop-up windows.
     */
    getIdentityCredentialAsync(showDialog?: boolean): Promise<TokenCredential | undefined>;

    /**
     * Azure sign out
     */
    signout(): Promise<boolean>

    /**
     * Add update account info callback. If this method called twice, the latter will overwrite the previous execution.
     * @param status SignedIn: User already sign in, SignedOut: User sign out.
     * @param token SignedIn: access token string, SignedOut: undefined.
     * @param accountInfo SignedIn: access token json object, SignedOut: undefined.
     */
    setStatusChangeCallback(statusChange: (status: string, token?: string, accountInfo?: Record<string, unknown>) => Promise<void>):  Promise<boolean>;
}


/**
 * Provide team accessToken
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
     * Add update account info callback. If this method called twice, the latter will overwrite the previous execution.
     * @param status SignedIn: User already sign in, SignedOut: User sign out.
     * @param token SignedIn: access token string, SignedOut: undefined.
     * @param accountInfo SignedIn: access token json object, SignedOut: undefined.
     */
    setStatusChangeCallback(statusChange: (status: string, token?: string, accountInfo?: Record<string, unknown>) => Promise<void>):  Promise<boolean>;
}


/**
 * Provide graph accessToken and JSON object
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
     * Add update account info callback. If this method called twice, the latter will overwrite the previous execution.
     * @param status SignedIn: User already sign in, SignedOut: User sign out.
     * @param token SignedIn: access token string, SignedOut: undefined.
     * @param accountInfo SignedIn: access token json object, SignedOut: undefined.
     */
    setStatusChangeCallback(statusChange: (status: string, token?: string, accountInfo?: Record<string, unknown>) => Promise<void>):  Promise<boolean>;
}


export type TokenProvider = {
    azure: AzureAccountProvider;
    graph: GraphTokenProvider;
    appStudio: AppStudioTokenProvider;
};