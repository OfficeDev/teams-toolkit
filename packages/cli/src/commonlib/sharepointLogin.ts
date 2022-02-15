// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { SharepointTokenProvider, UserError } from "@microsoft/teamsfx-api";
import { LogLevel } from "@azure/msal-node";
import { checkIsOnline, CodeFlowLogin } from "./codeFlowLogin";
import CLILogProvider from "./log";
import { CryptoCachePlugin } from "./cacheAccess";
import { signedIn, signedOut } from "./common/constant";
import { login, LoginStatus } from "./common/login";
import axios from "axios";

const accountName = "appStudio";

const graphScopes = ["https://graph.microsoft.com/User.ReadBasic.All"];
const SERVER_PORT = 0;

const graphCachePlugin = new CryptoCachePlugin(accountName);
const cachePlugin = new CryptoCachePlugin(accountName);

export class SharepointLogin extends login implements SharepointTokenProvider {
  private static instance: SharepointLogin;

  private static codeFlowInstance: CodeFlowLogin;
  private graphCodeFlowInstance: CodeFlowLogin;

  private static statusChange?: (
    status: string,
    token?: string,
    accountInfo?: Record<string, unknown>
  ) => Promise<void>;

  private constructor() {
    super();
    this.graphCodeFlowInstance = new CodeFlowLogin(
      graphScopes,
      this.getConfig(graphCachePlugin),
      SERVER_PORT,
      accountName
    );
  }

  /**
   * Gets instance
   * @returns instance
   */
  public static getInstance(): SharepointLogin {
    if (!SharepointLogin.instance) {
      SharepointLogin.instance = new SharepointLogin();
    }

    return SharepointLogin.instance;
  }

  /**
   * Get team access token
   */
  async getAccessToken(showDialog = true): Promise<string | undefined> {
    let isFirstLogin = false;
    if (!SharepointLogin.codeFlowInstance) {
      isFirstLogin = true;
      try {
        const scopes = await this.getScopes(showDialog);
        if (!scopes) {
          return undefined;
        }
        SharepointLogin.codeFlowInstance = new CodeFlowLogin(
          scopes,
          this.getConfig(cachePlugin),
          SERVER_PORT,
          accountName
        );
      } catch (error) {
        throw error;
      }
    }

    await SharepointLogin.codeFlowInstance.reloadCache();
    if (!isFirstLogin) {
      try {
        const scopes = await this.getScopes(showDialog);
        if (!scopes) {
          return undefined;
        }
        SharepointLogin.codeFlowInstance.scopes = scopes;
      } catch (error) {
        throw error;
      }
    }
    const accessToken = SharepointLogin.codeFlowInstance.getToken();
    return accessToken;
  }

  private async getSPTenant(accessToken: string): Promise<string> {
    const GRAPH_TENANT_ENDPT = "https://graph.microsoft.com/v1.0/sites/root?$select=webUrl";

    if (accessToken.length > 0) {
      const response = await axios.get(GRAPH_TENANT_ENDPT, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.data.webUrl;
    }
    return "";
  }

  private async getScopes(showDialog: boolean): Promise<string[] | undefined> {
    await this.graphCodeFlowInstance.reloadCache();
    try {
      const graphToken = await this.getGraphAccessToken(showDialog);
      if (!graphToken) {
        return undefined;
      }

      const tenant = await this.getSPTenant(graphToken!);
      if (!tenant) {
        return undefined;
      }
      const scopes = [`${tenant}/Sites.FullControl.All`];
      return scopes;
    } catch (error) {
      throw error;
    }
  }

  async getGraphAccessToken(showDialog = true): Promise<string | undefined> {
    await this.graphCodeFlowInstance.reloadCache();
    if (!this.graphCodeFlowInstance.account) {
      try {
        const loginToken = await this.graphCodeFlowInstance.getToken();
        if (loginToken && SharepointLogin.statusChange !== undefined) {
          const tokenJson = await this.getJsonObject();
          await SharepointLogin.statusChange(signedIn, loginToken, tokenJson);
        }
        await this.notifyStatus();
        return loginToken;
      } catch (error) {
        this.notifyStatus();
        throw error;
      }
    }

    return this.graphCodeFlowInstance.getToken();
  }

  async getJsonObject(showDialog = true): Promise<Record<string, unknown> | undefined> {
    const token = await this.getAccessToken(showDialog);
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

  async getStatus(): Promise<LoginStatus> {
    await this.graphCodeFlowInstance.reloadCache();
    if (this.graphCodeFlowInstance.account) {
      const loginToken = await this.graphCodeFlowInstance.getToken(false);
      if (loginToken) {
        const tokenJson = await this.getJsonObject();
        return Promise.resolve({ status: signedIn, token: loginToken, accountInfo: tokenJson });
      } else {
        if (await checkIsOnline()) {
          return Promise.resolve({ status: signedOut, token: undefined, accountInfo: undefined });
        } else {
          return Promise.resolve({
            status: signedIn,
            token: undefined,
            accountInfo: { upn: this.graphCodeFlowInstance.account?.username },
          });
        }
      }
    } else {
      return Promise.resolve({ status: signedOut, token: undefined, accountInfo: undefined });
    }
  }

  private getConfig(cachePlugin: CryptoCachePlugin) {
    return {
      auth: {
        clientId: "7ea7c24c-b1f6-4a20-9d11-9ae12e9e7ac0",
        authority: "https://login.microsoftonline.com/common",
      },
      system: {
        loggerOptions: {
          loggerCallback(loglevel: any, message: any, containsPii: any) {
            if (this.logLevel <= LogLevel.Error) {
              CLILogProvider.log(4 - loglevel, message);
            }
          },
          piiLoggingEnabled: false,
          logLevel: LogLevel.Error,
        },
      },
      cache: {
        cachePlugin,
      },
    };
  }
}

import sharepointLoginUserPassword from "./sharepointLoginUserPassword";

const ciEnabled = process.env.CI_ENABLED;
const sharepointLogin =
  ciEnabled && ciEnabled === "true" ? sharepointLoginUserPassword : SharepointLogin.getInstance();

export default sharepointLogin;
