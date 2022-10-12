// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { M365TokenProvider } from "@microsoft/teamsfx-api";
import { ResultFactory } from "../results";
import { GetTokenError, TenantNotExistError } from "../errors";
import { AppStudioScopes, GraphScopes } from "../../../../common/tools";

export enum TokenAudience {
  Graph = "graph",
  AppStudio = "appStudio",
}

export interface GraphAndAppStudioTokenProvider {
  m365?: M365TokenProvider;
}
interface TokenInstance {
  getToken(tokenProvider: GraphAndAppStudioTokenProvider): Promise<string | undefined>;
  getTenant(tokenProvider: GraphAndAppStudioTokenProvider): Promise<string | undefined>;
}

class GraphInstance implements TokenInstance {
  public async getToken(
    tokenProvider: GraphAndAppStudioTokenProvider
  ): Promise<string | undefined> {
    const tokenRes = await tokenProvider.m365?.getAccessToken({ scopes: GraphScopes });
    const token = tokenRes?.isOk() ? tokenRes.value : undefined;
    return token;
  }

  public async getTenant(
    tokenProvider: GraphAndAppStudioTokenProvider
  ): Promise<string | undefined> {
    const tokenObjectRes = await tokenProvider.m365?.getJsonObject({ scopes: GraphScopes });
    const tokenObject = tokenObjectRes?.isOk() ? tokenObjectRes.value : undefined;
    if (!tokenObject) {
      return undefined;
    }

    const tenantId: string = (tokenObject as any).tid;
    return tenantId;
  }
}

class AppStudioInstance implements TokenInstance {
  public async getToken(
    tokenProvider: GraphAndAppStudioTokenProvider
  ): Promise<string | undefined> {
    const tokenRes = await tokenProvider.m365?.getAccessToken({ scopes: AppStudioScopes });
    const token = tokenRes?.isOk() ? tokenRes.value : undefined;
    return token;
  }

  public async getTenant(
    tokenProvider: GraphAndAppStudioTokenProvider
  ): Promise<string | undefined> {
    const tokenObjectRes = await tokenProvider.m365?.getJsonObject({ scopes: AppStudioScopes });
    const tokenObject = tokenObjectRes?.isOk() ? tokenObjectRes.value : undefined;
    if (!tokenObject) {
      return undefined;
    }

    const tenantId: string = (tokenObject as any).tid;
    return tenantId;
  }
}

export class TokenProvider {
  static token?: string;
  static tenantId?: string;
  static audience: TokenAudience;

  public static async init(
    tokenProvider: GraphAndAppStudioTokenProvider,
    audience: TokenAudience = TokenAudience.Graph
  ): Promise<void> {
    this.audience = audience;

    let instance: TokenInstance;
    if (audience === TokenAudience.AppStudio) {
      instance = new AppStudioInstance();
    } else {
      instance = new GraphInstance();
    }

    const token = await instance.getToken(tokenProvider);
    if (token) {
      TokenProvider.token = token;
    } else {
      throw ResultFactory.SystemError(GetTokenError.name, GetTokenError.message(this.audience));
    }

    const tenantId = await instance.getTenant(tokenProvider);
    if (tenantId) {
      this.tenantId = tenantId;
    } else {
      throw ResultFactory.SystemError(TenantNotExistError.name, TenantNotExistError.message());
    }
  }
}
