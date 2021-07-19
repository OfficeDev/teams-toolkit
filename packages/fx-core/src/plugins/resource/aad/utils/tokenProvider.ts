// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { PluginContext } from "@microsoft/teamsfx-api";
import { ResultFactory } from "../results";
import { GetTokenError, TenantNotExistError } from "../errors";

export enum TokenAudience {
  Graph = "graph",
  AppStudio = "appStudio",
}

interface TokenInstance {
  getToken(ctx: PluginContext): Promise<string | undefined>;
  getTenant(ctx: PluginContext): Promise<string | undefined>;
}

class GraphInstance implements TokenInstance {
  public async getToken(ctx: PluginContext): Promise<string | undefined> {
    const token = await ctx.graphTokenProvider?.getAccessToken();
    return token;
  }

  public async getTenant(ctx: PluginContext): Promise<string | undefined> {
    const tokenObject = await ctx.graphTokenProvider?.getJsonObject();
    if (!tokenObject) {
      return undefined;
    }

    const tenantId: string = (tokenObject as any).tid;
    return tenantId;
  }
}

class AppStudioInstance implements TokenInstance {
  public async getToken(ctx: PluginContext): Promise<string | undefined> {
    const token = await ctx.appStudioToken?.getAccessToken();
    return token;
  }

  public async getTenant(ctx: PluginContext): Promise<string | undefined> {
    const tokenObject = await ctx.appStudioToken?.getJsonObject();
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
    ctx: PluginContext,
    audience: TokenAudience = TokenAudience.Graph
  ): Promise<void> {
    this.audience = audience;

    let instance: TokenInstance;
    if (audience === TokenAudience.AppStudio) {
      instance = new AppStudioInstance();
    } else {
      instance = new GraphInstance();
    }

    const token = await instance.getToken(ctx);
    if (token) {
      TokenProvider.token = token;
    } else {
      throw ResultFactory.SystemError(GetTokenError.name, GetTokenError.message(this.audience));
    }

    const tenantId = await instance.getTenant(ctx);
    if (tenantId) {
      this.tenantId = tenantId;
    } else {
      throw ResultFactory.SystemError(TenantNotExistError.name, TenantNotExistError.message());
    }
  }
}
