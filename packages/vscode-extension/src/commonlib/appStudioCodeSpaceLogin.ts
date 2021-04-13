// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { AppStudioTokenProvider } from "fx-api";
import * as vscode from "vscode";
import { login } from "./common/login";
import { signedIn, signedOut } from "./common/constant";

const scopes = ["https://dev.teams.microsoft.com/AppDefinitions.ReadWrite"];

// this login to work for code space only
export class AppStudioCodeSpaceLogin extends login implements AppStudioTokenProvider {
  private static instance: AppStudioCodeSpaceLogin;

  private static statusChange?: (
    status: string,
    token?: string,
    accountInfo?: Record<string, unknown>
  ) => Promise<void>;

  /**
   * Gets instance
   * @returns instance
   */
  public static getInstance(): AppStudioCodeSpaceLogin {
    if (!AppStudioCodeSpaceLogin.instance) {
      AppStudioCodeSpaceLogin.instance = new AppStudioCodeSpaceLogin();
    }

    return AppStudioCodeSpaceLogin.instance;
  }

  /**
   * Get team access token
   */
  async getAccessToken(showDialog = true): Promise<string | undefined> {
    let session = await this.tryAuthenticate(false);
    if (session && session.accessToken) {
      // already login
      return session.accessToken;
    } else {
      // ask user to login
      session = await this.tryAuthenticate(true);
      if (session && session.accessToken) {
        // login success
        const tokenJson = this.parseToken(session.accessToken);
        if (AppStudioCodeSpaceLogin.statusChange) {
          await AppStudioCodeSpaceLogin.statusChange("SignedIn", session.accessToken, tokenJson);
        }
        await this.notifyStatus();
        return session.accessToken;
      }
    }

    return undefined;
  }

  async getJsonObject(showDialog = true): Promise<Record<string, unknown> | undefined> {
    const token = await this.getAccessToken(showDialog);
    return this.parseToken(token);
  }

  async signout(): Promise<boolean> {
    if (AppStudioCodeSpaceLogin.statusChange !== undefined) {
      await AppStudioCodeSpaceLogin.statusChange("SignedOut", undefined, undefined);
    }
    await this.notifyStatus();
    return new Promise((resolve) => {
      resolve(true);
    });
  }

  async setStatusChangeCallback(
    statusChange: (status: string, token?: string, accountInfo?: Record<string, unknown>) => Promise<void>
  ): Promise<boolean> {
    AppStudioCodeSpaceLogin.statusChange = statusChange;
    const session = await this.tryAuthenticate(false);
    if (session && session.accessToken) {
      // already login
      const tokenJson = this.parseToken(session.accessToken);
      await AppStudioCodeSpaceLogin.statusChange("SignedIn", session.accessToken, tokenJson);
    }
    
    return new Promise((resolve) => {
      resolve(true);
    });
  }

  private async tryAuthenticate(createIfNone: boolean): Promise<vscode.AuthenticationSession | undefined> {
    return vscode.authentication
      .getSession("microsoft", scopes, { createIfNone: createIfNone })
      .then((session: vscode.AuthenticationSession | undefined) => {
        return session;
      });
  }

  private parseToken(token: string | undefined): Record<string, unknown> | undefined {
    if (token) {
      const array = token.split(".");
      const buff = Buffer.from(array[1], "base64");
      return JSON.parse(buff.toString("utf-8"));
    } else {
      return undefined;
    }
  }

  async notifyStatus(): Promise<boolean> {
    if (this.statusChangeMap.size > 0) {
      const session = await this.tryAuthenticate(false);
      if (session && session.accessToken) {
        const tokenJson = await this.getJsonObject();
        for (const entry of this.statusChangeMap.entries()) {
         entry[1](signedIn, session.accessToken, tokenJson);
        }
      } else {
        for (const entry of this.statusChangeMap.entries()) {
          entry[1](signedOut, undefined, undefined);
        }
      }
    }
    return true;
  }
}

export default AppStudioCodeSpaceLogin.getInstance();
