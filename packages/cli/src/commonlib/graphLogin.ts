// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { GraphTokenProvider } from "@microsoft/teamsfx-api";
import { LogLevel } from "@azure/msal-node";
import { CodeFlowLogin } from "./codeFlowLogin";

import CLILogProvider from "./log";
import { login, LoginStatus } from "./common/login";
import { signedIn, signedOut } from "./common/constant";
import { getBeforeCacheAccess, getAfterCacheAccess } from "./cacheAccess";

const accountName = "appStudio";
const scopes = ["Application.ReadWrite.All"];

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
      loggerCallback(loglevel: any, message: any, containsPii: any) {
        if (this.logLevel<=LogLevel.Error) {
          CLILogProvider.log(4 - loglevel, message);
        }
      },
      piiLoggingEnabled: false,
      logLevel: LogLevel.Error
    }
  },
  cache: {
    cachePlugin
  }
};

const SERVER_PORT = 0;

/**
 * use msal to implement graph login
 */
export class GraphLogin extends login implements GraphTokenProvider {
  private static instance: GraphLogin;

  private static codeFlowInstance: CodeFlowLogin;

  private static statusChange?: (
    status: string,
    token?: string,
    accountInfo?: Record<string, unknown>
  ) => Promise<void>;

  private constructor() {
    super();
    GraphLogin.codeFlowInstance = new CodeFlowLogin(scopes, config, SERVER_PORT, accountName);
  }

  /**
   * Gets instance
   * @returns instance
   */
  public static getInstance(): GraphLogin {
    if (!GraphLogin.instance) {
      GraphLogin.instance = new GraphLogin();
    }

    return GraphLogin.instance;
  }

  async getAccessToken(showDialog = true): Promise<string | undefined> {
    await GraphLogin.codeFlowInstance.reloadCache();
    if (!GraphLogin.codeFlowInstance.account) {
      const loginToken = await GraphLogin.codeFlowInstance.getToken();
      if (loginToken && GraphLogin.statusChange !== undefined) {
        const tokenJson = await this.getJsonObject();
        await GraphLogin.statusChange("SignedIn", loginToken, tokenJson);
      }
      await this.notifyStatus();
      return loginToken;
    }
    const accessToken = GraphLogin.codeFlowInstance.getToken();
    return accessToken;
  }

  async getJsonObject(showDialog = true): Promise<Record<string, unknown> | undefined> {
    const token = await this.getAccessToken();
    if (token) {
      const array = token.split(".");
      const buff = Buffer.from(array[1], "base64");
      return new Promise((resolve) => {
        resolve(JSON.parse(buff.toString("utf-8")));
      });
    } else {
      return new Promise((resolve) => {
        resolve(undefined);
      });
    }
  }

  async signout(): Promise<boolean> {
    GraphLogin.codeFlowInstance.account = undefined;
    if (GraphLogin.statusChange !== undefined) {
      await GraphLogin.statusChange("SignedOut", undefined, undefined);
    }
    await this.notifyStatus();
    return new Promise((resolve) => {
      resolve(true);
    });
  }

  async getStatus(): Promise<LoginStatus> {
    if (GraphLogin.codeFlowInstance.account) {
      const loginToken = await GraphLogin.codeFlowInstance.getToken();
      const tokenJson = await this.getJsonObject();
      return Promise.resolve({ status: signedIn, token: loginToken, accountInfo: tokenJson });
    } else {
      return Promise.resolve({ status: signedOut, token: undefined, accountInfo: undefined });
    }
  }
}

import GraphTokenProviderUserPassword from "./graphLoginUserPassword";

const ciEnabled = process.env.CI_ENABLED;
const graphLogin = ciEnabled && ciEnabled === "true" ? GraphTokenProviderUserPassword : GraphLogin.getInstance();

export default graphLogin;
