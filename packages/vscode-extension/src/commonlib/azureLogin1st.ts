/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { TokenCredential } from "@azure/core-auth";
import { TokenCredentialsBase, DeviceTokenCredentials } from "@azure/ms-rest-nodeauth";
import { AzureAccountProvider, UserError } from "fx-api";
import { ExtensionErrors } from "../error";
import { CodeFlowLogin, LoginFailureError, ConvertTokenToJson } from "./codeFlowLogin";
import * as vscode from "vscode";
import * as identity from "@azure/identity";
import { MemoryCache } from "./memoryCache";
import VsCodeLogInstance from "./log";
import { getBeforeCacheAccess, getAfterCacheAccess } from "./cacheAccess";
import { LogLevel } from "@azure/msal-node";

const env = {
  name: "AzureCloud",
  portalUrl: "https://portal.azure.com",
  publishingProfileUrl: "https://go.microsoft.com/fwlink/?LinkId=254432",
  managementEndpointUrl: "https://management.core.windows.net",
  resourceManagerEndpointUrl: "https://management.azure.com/",
  sqlManagementEndpointUrl: "https://management.core.windows.net:8443/",
  sqlServerHostnameSuffix: ".database.windows.net",
  galleryEndpointUrl: "https://gallery.azure.com/",
  activeDirectoryEndpointUrl: "https://login.microsoftonline.com/",
  activeDirectoryResourceId: "https://management.core.windows.net/",
  activeDirectoryGraphResourceId: "https://graph.windows.net/",
  batchResourceId: "https://batch.core.windows.net/",
  activeDirectoryGraphApiVersion: "2013-04-05",
  storageEndpointSuffix: "core.windows.net",
  keyVaultDnsSuffix: ".vault.azure.net",
  azureDataLakeStoreFileSystemEndpointSuffix: "azuredatalakestore.net",
  azureDataLakeAnalyticsCatalogAndJobEndpointSuffix: "azuredatalakeanalytics.net",
  validateAuthority: true
};

const accountName = "azure";
const scopes = ["https://management.azure.com/user_impersonation"];
const SERVER_PORT = 0;

const beforeCacheAccess = getBeforeCacheAccess(accountName);
const afterCacheAccess = getAfterCacheAccess(scopes, accountName);

const cachePlugin = {
  beforeCacheAccess,
  afterCacheAccess
};

const config = {
  auth: {
    clientId: "7ea7c24c-b1f6-4a20-9d11-9ae12e9e7ac0",
    authority: "https://login.microsoftonline.com/common"
  },
  system: {
    loggerOptions: {
      // @ts-ignore
      loggerCallback(loglevel, message, containsPii) {
        VsCodeLogInstance.info(message);
      },
      piiLoggingEnabled: false,
      logLevel: LogLevel.Error
    }
  },
  cache: {
    cachePlugin
  }
};

//@ts-ignore
const memory = new MemoryCache();

export class AzureAccountManager implements AzureAccountProvider {
  private static instance: AzureAccountManager;
  private static codeFlowInstance: CodeFlowLogin;
  private static domain: string | undefined;
  private static username: string | undefined;

  private static statusChange?: (
    status: string,
    token?: string,
    accountInfo?: Record<string, unknown>
  ) => Promise<void>;

  private constructor() {
    AzureAccountManager.codeFlowInstance = new CodeFlowLogin(
      scopes,
      config,
      SERVER_PORT,
      accountName
    );
  }

  /**
   * Gets instance
   * @returns instance
   */
  public static getInstance(): AzureAccountManager {
    if (!AzureAccountManager.instance) {
      AzureAccountManager.instance = new AzureAccountManager();
    }

    return AzureAccountManager.instance;
  }

  /**
   * Get AccountCredential
   *  - Use scenario : https://docs.microsoft.com/en-us/azure/developer/javascript/core/node-sdk-azure-authenticate
   *  - NPM guideline : https://docs.microsoft.com/en-us/azure/developer/javascript/core/node-sdk-azure-authenticate
   * @returns the instance of TokenCredentialsBase
   */
  getAccountCredential(showDialog = true): TokenCredentialsBase | undefined {
    if (AzureAccountManager.codeFlowInstance.account && memory.size() > 0) {
      const credential = new DeviceTokenCredentials(
        config.auth.clientId,
        AzureAccountManager.domain,
        AzureAccountManager.username,
        undefined,
        env,
        memory
      );
      return credential;
    }

    return undefined;
  }

  /**
   * Get IdentityCredential
   *  - Use scenario : https://docs.microsoft.com/en-us/azure/developer/javascript/core/node-sdk-azure-authenticate
   *  - NPM guideline : https://www.npmjs.com/package/@azure/ms-rest-nodeauth
   * @returns the instance of TokenCredential
   */
  getIdentityCredential(showDialog = true): TokenCredential | undefined {
    return undefined;
  }

  /**
   * Async get ms-rest-* [credential](https://github.com/Azure/ms-rest-nodeauth/blob/master/lib/credentials/tokenCredentialsBase.ts)
   */
  async getAccountCredentialAsync(showDialog = true): Promise<TokenCredentialsBase | undefined> {
    if (AzureAccountManager.codeFlowInstance.account) {
      return new Promise(async (resolve) => {
        const tokenJson = await this.getJsonObject();
        const credential = new DeviceTokenCredentials(
          config.auth.clientId,
          (tokenJson as any).tid,
          (tokenJson as any).upn,
          undefined,
          env,
          memory
        );
        resolve(credential);
      });
    }
    await this.login(showDialog);
    await this.updateLoginStatus();
    return this.doGetAccountCredentialAsync();
  }

  /**
   * Async get identity [crendential](https://github.com/Azure/azure-sdk-for-js/blob/master/sdk/core/core-auth/src/tokenCredential.ts)
   */
  async getIdentityCredentialAsync(showDialog = true): Promise<TokenCredential | undefined> {
    return undefined;
  }

  private async updateLoginStatus(): Promise<void> {
    if (
      AzureAccountManager.codeFlowInstance.account &&
      AzureAccountManager.statusChange !== undefined
    ) {
      const credential = await this.doGetAccountCredentialAsync();
      const accessToken = await credential?.getToken();
      const accountJson = await this.getJsonObject();
      await AzureAccountManager.statusChange("SignedIn", accessToken?.accessToken, accountJson);
    }
  }

  private async login(showDialog: boolean): Promise<void> {
    if (showDialog) {
      const userConfirmation: boolean = await this.doesUserConfirmLogin();
      if (!userConfirmation) {
        // throw user cancel error
        throw new UserError(ExtensionErrors.UserCancel, "User Cancel", "Login");
      }
    }
    const accessToken = await AzureAccountManager.codeFlowInstance.getToken();
    const tokenJson = await this.getJsonObject();
    this.setMemoryCache(accessToken, tokenJson);
  }

  private setMemoryCache(accessToken: string | undefined, tokenJson: object | undefined) {
    if (accessToken) {
      AzureAccountManager.domain = (tokenJson as any).tid;
      AzureAccountManager.username = (tokenJson as any).upn;
      tokenJson = ConvertTokenToJson(accessToken);
      const tokenExpiresIn =
        Math.round(new Date().getTime() / 1000) - ((tokenJson as any).iat as number);
      memory.add(
        [
          {
            tokenType: "Bearer",
            expiresIn: tokenExpiresIn,
            expiresOn: {},
            resource: env.activeDirectoryResourceId,
            accessToken: accessToken,
            userId: AzureAccountManager.username,
            _clientId: config.auth.clientId,
            _authority: env.activeDirectoryEndpointUrl + AzureAccountManager.domain
          }
        ],
        function() {}
      );
    }
  }

  private async doGetAccountCredentialAsync(): Promise<TokenCredentialsBase | undefined> {
    if (AzureAccountManager.codeFlowInstance.account) {
      const dataJson = await this.getJsonObject();
      const credential = new DeviceTokenCredentials(
        config.auth.clientId,
        (dataJson as any).tid,
        (dataJson as any).upn,
        undefined,
        env,
        memory
      );
      return Promise.resolve(credential);
    }
    return Promise.reject(LoginFailureError());
  }

  private doGetIdentityCredentialAsync(): Promise<TokenCredential | undefined> {
    return Promise.resolve(undefined);
  }

  private async doesUserConfirmLogin(): Promise<boolean> {
    const warningMsg = "Please sign into your Azure account";
    const confirm = "Confirm";
    const userSelected: string | undefined = await vscode.window.showWarningMessage(
      warningMsg,
      { modal: true },
      confirm
    );
    return Promise.resolve(userSelected === confirm);
  }

  async getJsonObject(showDialog = true): Promise<Record<string, unknown> | undefined> {
    if (AzureAccountManager.codeFlowInstance.account) {
      const token = await AzureAccountManager.codeFlowInstance.getToken();
      const array = token!.split(".");
      const buff = Buffer.from(array[1], "base64");
      return Promise.resolve(JSON.parse(buff.toString("utf-8")));
    } else {
      return Promise.resolve(undefined);
    }
  }

  /**
   * singnout from Azure
   */
  async signout(): Promise<boolean> {
    AzureAccountManager.codeFlowInstance.account = undefined;
    if (AzureAccountManager.statusChange !== undefined) {
      await AzureAccountManager.statusChange("SignedOut", undefined, undefined);
    }
    AzureAccountManager.codeFlowInstance.logout();
    return Promise.resolve(true);
  }

  /**
   * Add update account info callback
   */
  async setStatusChangeCallback(
    statusChange: (status: string, token?: string, accountInfo?: Record<string, unknown>) => Promise<void>
  ): Promise<boolean> {
    AzureAccountManager.statusChange = statusChange;
    await AzureAccountManager.codeFlowInstance.reloadCache();
    if (AzureAccountManager.codeFlowInstance.account) {
      const loginToken = await AzureAccountManager.codeFlowInstance.getToken();
      const tokenJson = await this.getJsonObject();
      this.setMemoryCache(loginToken, tokenJson);
      await AzureAccountManager.statusChange("SignedIn", loginToken, tokenJson);
    }
    return Promise.resolve(true);
  }
}

export default AzureAccountManager.getInstance();
