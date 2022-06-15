// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as vscode from "vscode";
import { LoginStatus } from "./common/login";
import { signedIn, signedOut } from "./common/constant";
import { AppStudioScopes } from "@microsoft/teamsfx-core";
import {
  BasicLogin,
  err,
  FxError,
  M365TokenProvider,
  ok,
  Result,
  TokenRequest,
} from "@microsoft/teamsfx-api";
import { getDefaultString } from "../utils/localizeUtils";
import { UserCancelError } from "./codeFlowLogin";

// this login to work for code space only
export class M365CodeSpaceLogin extends BasicLogin implements M365TokenProvider {
  private static instance: M365CodeSpaceLogin;

  /**
   * Gets instance
   * @returns instance
   */
  public static getInstance(): M365CodeSpaceLogin {
    if (!M365CodeSpaceLogin.instance) {
      M365CodeSpaceLogin.instance = new M365CodeSpaceLogin();
    }

    return M365CodeSpaceLogin.instance;
  }

  /**
   * Get team access token
   */
  async getAccessToken(tokenRequest: TokenRequest): Promise<Result<string, FxError>> {
    let session = await this.tryAuthenticate(false, tokenRequest.scopes);
    if (session && session.accessToken) {
      // already login
      return ok(session.accessToken);
    } else {
      // ask user to login
      session = await this.tryAuthenticate(true, tokenRequest.scopes);
      if (session && session.accessToken) {
        await this.notifyStatus(tokenRequest);
        return ok(session.accessToken);
      }
    }

    return err(UserCancelError(getDefaultString("teamstoolkit.codeFlowLogin.loginComponent")));
  }

  async getJsonObject(
    tokenRequest: TokenRequest
  ): Promise<Result<Record<string, unknown>, FxError>> {
    const token = await this.getAccessToken(tokenRequest);
    if (token.isOk()) {
      return ok(this.parseToken(token.value) as any);
    } else {
      return err(token.error);
    }
  }

  async signout(): Promise<boolean> {
    await this.notifyStatus({ scopes: AppStudioScopes });
    return new Promise((resolve) => {
      resolve(true);
    });
  }

  private async tryAuthenticate(
    createIfNone: boolean,
    scopes: Array<string>
  ): Promise<vscode.AuthenticationSession | undefined> {
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

  async getStatus(tokenRequest: TokenRequest): Promise<Result<LoginStatus, FxError>> {
    const session = await this.tryAuthenticate(false, tokenRequest.scopes);
    if (session && session.accessToken) {
      const tokenJson = await this.parseToken(session.accessToken);
      return ok({
        status: signedIn,
        token: session.accessToken,
        accountInfo: tokenJson,
      });
    } else {
      return ok({ status: signedOut, token: undefined, accountInfo: undefined });
    }
  }
}

export default M365CodeSpaceLogin.getInstance();
