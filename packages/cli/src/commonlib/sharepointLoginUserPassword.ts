// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import axios, { AxiosRequestConfig } from "axios";
import dotenv from "dotenv";
import qs from "querystring";

import { SharepointTokenProvider, LogLevel } from "@microsoft/teamsfx-api";

import * as cfg from "./common/userPasswordConfig";
import CLILogProvider from "./log";

dotenv.config();

const user = cfg.M365_ACCOUNT_NAME;
const password = cfg.M365_ACCOUNT_PASSWORD;

type LoginStatus = {
  status: string;
  token?: string;
  accountInfo?: Record<string, unknown>;
};

export class SharepointTokenProviderUserPassword implements SharepointTokenProvider {
  private static instance: SharepointTokenProviderUserPassword;

  private static accessToken: string | undefined;

  public static getInstance(): SharepointTokenProviderUserPassword {
    if (!SharepointTokenProviderUserPassword.instance) {
      SharepointTokenProviderUserPassword.instance = new SharepointTokenProviderUserPassword();
    }
    return SharepointTokenProviderUserPassword.instance;
  }

  /**
   * Get sharepoint access token
   */
  async getAccessToken(showDialog = true): Promise<string | undefined> {
    const graphConfig = this.getConfig("https://graph.microsoft.com/User.ReadBasic.All");

    let graphAccessToken: string | undefined = undefined;
    await axios(graphConfig)
      .then((r: any) => {
        graphAccessToken = r.data.access_token;
      })
      .catch((e: any) => {
        CLILogProvider.necessaryLog(LogLevel.Error, JSON.stringify(e, undefined, 4));
      });

    if (!graphAccessToken) {
      CLILogProvider.necessaryLog(LogLevel.Error, "Failed to get graph token");
    }

    const sharepointScope = await this.getScopes(graphAccessToken!);
    if (!sharepointScope || sharepointScope.length === 0) {
      CLILogProvider.necessaryLog(LogLevel.Error, "Failed to get tenant info");
    }
    const sharepointConfig = this.getConfig(sharepointScope![0]);
    await axios(sharepointConfig)
      .then((r: any) => {
        SharepointTokenProviderUserPassword.accessToken = r.data.access_token;
      })
      .catch((e: any) => {
        CLILogProvider.necessaryLog(LogLevel.Error, JSON.stringify(e, undefined, 4));
      });

    return SharepointTokenProviderUserPassword.accessToken;
  }

  private getConfig(tokenScope: string): AxiosRequestConfig {
    const data = qs.stringify({
      client_id: cfg.client_id,
      scope: tokenScope,
      username: user,
      password: password,
      grant_type: "password",
    });

    const config: AxiosRequestConfig = {
      method: "post",
      url: `https://login.microsoftonline.com/${
        cfg.M365_TENANT_ID || "organizations"
      }/oauth2/v2.0/token`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie:
          "fpc=AmzaQu9yHbpLtMD2LmHazdRCGxwGAQAAAIW47NcOAAAA; x-ms-gateway-slice=estsfd; stsservicecookie=estsfd",
      },
      data: data,
    };
    return config;
  }

  private async getSPTenant(accessToken: string): Promise<string> {
    const GRAPH_TENANT_ENDPT = "https://graph.microsoft.com/v1.0/sites/root?$select=webUrl";

    if (accessToken.length > 0) {
      axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

      const response = await axios.get(GRAPH_TENANT_ENDPT);
      return response.data.webUrl;
    }
    return "";
  }

  private async getScopes(graphToken: string): Promise<string[] | undefined> {
    try {
      const tenant = await this.getSPTenant(graphToken);
      if (!tenant) {
        return undefined;
      }
      const scopes = [`${tenant}/Sites.FullControl.All`];
      return scopes;
    } catch (error) {
      throw error;
    }
  }

  async getJsonObject(showDialog?: boolean): Promise<Record<string, unknown> | undefined> {
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

  public async getStatus(): Promise<LoginStatus> {
    return Promise.resolve({
      status: "SignedIn",
    });
  }

  setStatusChangeMap(
    name: string,
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>
  ): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  removeStatusChangeMap(name: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
}

export default SharepointTokenProviderUserPassword.getInstance();
