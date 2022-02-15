// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AppStudioTokenProvider, GraphTokenProvider, PluginContext } from "@microsoft/teamsfx-api";
import { ResultFactory } from "../results";
import { GetTokenError, TenantNotExistError } from "../errors";

export enum TokenAudience {
  Graph = "graph",
  AppStudio = "appStudio",
}

export interface GraphAndAppStudioTokenProvider {
  graph?: GraphTokenProvider;
  appStudio?: AppStudioTokenProvider;
}
interface TokenInstance {
  getToken(tokenProvider: GraphAndAppStudioTokenProvider): Promise<string | undefined>;
  getTenant(tokenProvider: GraphAndAppStudioTokenProvider): Promise<string | undefined>;
}

class GraphInstance implements TokenInstance {
  public async getToken(
    tokenProvider: GraphAndAppStudioTokenProvider
  ): Promise<string | undefined> {
    const token = await tokenProvider.graph?.getAccessToken();
    return token;
  }

  public async getTenant(
    tokenProvider: GraphAndAppStudioTokenProvider
  ): Promise<string | undefined> {
    const tokenObject = await tokenProvider.graph?.getJsonObject();
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
    const token = await tokenProvider.appStudio?.getAccessToken();
    return token;
  }

  public async getTenant(
    tokenProvider: GraphAndAppStudioTokenProvider
  ): Promise<string | undefined> {
    const tokenObject = await tokenProvider.appStudio?.getJsonObject();
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
