// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { LogLevel } from "@azure/msal-node";
import {
  BasicLogin,
  err,
  FxError,
  M365TokenProvider,
  ok,
  Result,
  TokenRequest,
} from "@microsoft/teamsfx-api";
import { AuthSvcScopes, teamsDevPortalClient } from "@microsoft/teamsfx-core";
import ui from "../userInteraction";
import { CryptoCachePlugin } from "./cacheAccess";
import { CodeFlowLogin, ConvertTokenToJson, ErrorMessage } from "./codeFlowLogin";
import { m365CacheName, signedIn, signedOut } from "./common/constant";
import { LoginStatus } from "./common/login";
import CLILogProvider from "./log";
import M365TokenProviderUserPassword from "./m365LoginUserPassword";

const SERVER_PORT = 0;

const cachePlugin = new CryptoCachePlugin(m365CacheName);

const config = {
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

export class M365Login extends BasicLogin implements M365TokenProvider {
  private static instance: M365Login;
  private static codeFlowInstance: CodeFlowLogin;

  private constructor() {
    super();
    M365Login.codeFlowInstance = new CodeFlowLogin([], config, SERVER_PORT, m365CacheName);
  }

  /**
   * Gets instance
   * @returns instance
   */
  public static getInstance(): M365Login {
    if (!M365Login.instance) {
      M365Login.instance = new M365Login();
    }

    return M365Login.instance;
  }

  /**
   * Get team access token
   */
  async getAccessToken(tokenRequest: TokenRequest): Promise<Result<string, FxError>> {
    let needLogin = false;
    if (!M365Login.codeFlowInstance.account) {
      await M365Login.codeFlowInstance.reloadCache();
      if (M365Login.codeFlowInstance.account) {
        const regionTokenRes = await M365Login.codeFlowInstance.getTokenByScopes(AuthSvcScopes);
        if (regionTokenRes.isOk()) {
          await teamsDevPortalClient.setRegionEndpointByToken(regionTokenRes.value);
        }
      } else {
        needLogin = true;
      }
    }
    const tokenRes = await M365Login.codeFlowInstance.getTokenByScopes(tokenRequest.scopes);
    if (needLogin == true && M365Login.codeFlowInstance.account) {
      const regionTokenRes = await M365Login.codeFlowInstance.getTokenByScopes(AuthSvcScopes);
      if (regionTokenRes.isOk()) {
        await teamsDevPortalClient.setRegionEndpointByToken(regionTokenRes.value);
      }
    }

    if (tokenRes.isOk()) {
      return ok(tokenRes.value);
    } else {
      return tokenRes;
    }
  }

  async getJsonObject(
    tokenRequest: TokenRequest
  ): Promise<Result<Record<string, unknown>, FxError>> {
    const tokenRes = await this.getAccessToken(tokenRequest);
    if (tokenRes.isOk()) {
      const tokenJson = ConvertTokenToJson(tokenRes.value);
      return ok(tokenJson);
    } else {
      return err(tokenRes.error);
    }
  }

  async signout(): Promise<boolean> {
    M365Login.codeFlowInstance.account = undefined;
    await M365Login.codeFlowInstance.logout();
    return true;
  }

  async getStatus(tokenRequest: TokenRequest): Promise<Result<LoginStatus, FxError>> {
    if (!M365Login.codeFlowInstance.account) {
      await M365Login.codeFlowInstance.reloadCache();
    }
    if (M365Login.codeFlowInstance.account) {
      const tokenRes = await M365Login.codeFlowInstance.getTokenByScopes(
        tokenRequest.scopes,
        false
      );
      if (tokenRes.isOk()) {
        const tokenJson = ConvertTokenToJson(tokenRes.value);
        return ok({ status: signedIn, token: tokenRes.value, accountInfo: tokenJson });
      } else {
        if (tokenRes.error.name !== ErrorMessage.checkOnlineFailTitle) {
          return ok({ status: signedOut, token: undefined, accountInfo: undefined });
        } else {
          return ok({
            status: signedIn,
            token: undefined,
            accountInfo: { upn: M365Login.codeFlowInstance.account?.username },
          });
        }
      }
    } else {
      return ok({ status: signedOut, token: undefined, accountInfo: undefined });
    }
  }
}

const m365Login = !ui.interactive ? M365TokenProviderUserPassword : M365Login.getInstance();

export default m365Login;
