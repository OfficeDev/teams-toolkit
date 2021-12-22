// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {
  Func,
  FxError,
  Plugin,
  PluginContext,
  Result,
  ok,
  AzureSolutionSettings,
  Void,
} from "@microsoft/teamsfx-api";

import { LocalEnvBotKeys, LocalEnvBotKeysMigratedFromV1 } from "./constants";
import {
  LocalEnvFrontendKeys,
  LocalEnvBackendKeys,
  LocalEnvAuthKeys,
  LocalEnvCertKeys,
} from "./constants";
import { LocalEnvMultiProvider } from "../../../common/localEnvMultiProvider";
import { getAuthServiceFolder } from "./util/localService";
import { Service } from "typedi";
import { ResourcePlugins } from "../../solution/fx-solution/ResourcePluginContainer";
import {
  LocalSettingsAuthKeys,
  LocalSettingsBackendKeys,
  LocalSettingsBotKeys,
  LocalSettingsFrontendKeys,
  LocalSettingsTeamsAppKeys,
} from "../../../common/localSettingsConstants";
import { getAllowedAppIds } from "../../../common/tools";
import { ProjectSettingLoader } from "./projectSettingLoader";
import "./v2";

@Service(ResourcePlugins.LocalDebugPlugin)
export class LocalDebugPlugin implements Plugin {
  name = "fx-resource-local-debug";
  displayName = "LocalDebug";

  activate(solutionSettings: AzureSolutionSettings): boolean {
    return true;
  }

  public async scaffold(ctx: PluginContext): Promise<Result<any, FxError>> {
    return ok(Void);
  }

  public async localDebug(ctx: PluginContext): Promise<Result<any, FxError>> {
    return ok(Void);
  }

  public async postLocalDebug(ctx: PluginContext): Promise<Result<any, FxError>> {
    return ok(Void);
  }

  // Note: this may be called before `localDebug` so do not throw if any value is missing
  public async getLocalDebugEnvs(ctx: PluginContext): Promise<Record<string, string>> {
    const includeFrontend = ProjectSettingLoader.includeFrontend(ctx);
    const includeBackend = ProjectSettingLoader.includeBackend(ctx);
    const includeBot = ProjectSettingLoader.includeBot(ctx);
    const includeAuth = ProjectSettingLoader.includeAuth(ctx);
    // get config for local debug
    const clientId = ctx.localSettings?.auth?.get(LocalSettingsAuthKeys.ClientId) as string;
    const clientSecret = ctx.localSettings?.auth?.get(LocalSettingsAuthKeys.ClientSecret) as string;
    const applicationIdUri = ctx.localSettings?.auth?.get(
      LocalSettingsAuthKeys.ApplicationIdUris
    ) as string;
    const teamsAppTenantId = ctx.localSettings?.teamsApp?.get(
      LocalSettingsTeamsAppKeys.TenantId
    ) as string;

    const localAuthEndpoint = ctx.localSettings?.auth?.get(
      LocalSettingsAuthKeys.SimpleAuthServiceEndpoint
    ) as string;
    const localTabEndpoint = ctx.localSettings?.frontend?.get(
      LocalSettingsFrontendKeys.TabEndpoint
    ) as string;
    const localFuncEndpoint = ctx.localSettings?.backend?.get(
      LocalSettingsBackendKeys.FunctionEndpoint
    ) as string;

    const localEnvs: { [key: string]: string } = {};
    if (includeFrontend) {
      localEnvs[LocalEnvFrontendKeys.Browser] = ctx.localSettings?.frontend?.get(
        LocalSettingsFrontendKeys.Browser
      ) as string;
      localEnvs[LocalEnvFrontendKeys.Https] = ctx.localSettings?.frontend?.get(
        LocalSettingsFrontendKeys.Https
      ) as string;

      if (includeAuth) {
        // frontend local envs
        localEnvs[LocalEnvFrontendKeys.TeamsFxEndpoint] = localAuthEndpoint;
        localEnvs[LocalEnvFrontendKeys.LoginUrl] = `${localTabEndpoint}/auth-start.html`;
        localEnvs[LocalEnvFrontendKeys.ClientId] = clientId;

        // auth local envs (auth is only required by frontend)
        localEnvs[LocalEnvAuthKeys.Urls] = localAuthEndpoint;
        localEnvs[LocalEnvAuthKeys.ClientId] = clientId;
        localEnvs[LocalEnvAuthKeys.ClientSecret] = clientSecret;
        localEnvs[LocalEnvAuthKeys.IdentifierUri] = applicationIdUri;
        localEnvs[
          LocalEnvAuthKeys.AadMetadataAddress
        ] = `https://login.microsoftonline.com/${teamsAppTenantId}/v2.0/.well-known/openid-configuration`;
        localEnvs[
          LocalEnvAuthKeys.OauthAuthority
        ] = `https://login.microsoftonline.com/${teamsAppTenantId}`;
        localEnvs[LocalEnvAuthKeys.TabEndpoint] = localTabEndpoint;
        localEnvs[LocalEnvAuthKeys.AllowedAppIds] = getAllowedAppIds().join(";");
        localEnvs[LocalEnvAuthKeys.ServicePath] = getAuthServiceFolder();
      }

      if (includeBackend) {
        localEnvs[LocalEnvFrontendKeys.FuncEndpoint] = localFuncEndpoint;
        localEnvs[LocalEnvFrontendKeys.FuncName] = ctx.projectSettings
          ?.defaultFunctionName as string;
        localEnvs[LocalEnvBackendKeys.FuncWorkerRuntime] = "node";

        // function local envs
        localEnvs[LocalEnvBackendKeys.ClientId] = clientId;
        localEnvs[LocalEnvBackendKeys.ClientSecret] = clientSecret;
        localEnvs[LocalEnvBackendKeys.AuthorityHost] = "https://login.microsoftonline.com";
        localEnvs[LocalEnvBackendKeys.TenantId] = teamsAppTenantId;
        localEnvs[LocalEnvBackendKeys.ApiEndpoint] = localFuncEndpoint;
        localEnvs[LocalEnvBackendKeys.ApplicationIdUri] = applicationIdUri;
        localEnvs[LocalEnvBackendKeys.AllowedAppIds] = getAllowedAppIds().join(";");
      }

      localEnvs[LocalEnvCertKeys.SslCrtFile] = ctx.localSettings?.frontend?.get(
        LocalSettingsFrontendKeys.SslCertFile
      );
      localEnvs[LocalEnvCertKeys.SslKeyFile] = ctx.localSettings?.frontend?.get(
        LocalSettingsFrontendKeys.SslKeyFile
      );
    }

    if (includeBot) {
      // bot local env
      if (ProjectSettingLoader.isMigrateFromV1(ctx)) {
        localEnvs[LocalEnvBotKeysMigratedFromV1.BotId] = ctx.localSettings?.bot?.get(
          LocalSettingsBotKeys.BotId
        ) as string;
        localEnvs[LocalEnvBotKeysMigratedFromV1.BotPassword] = ctx.localSettings?.bot?.get(
          LocalSettingsBotKeys.BotPassword
        ) as string;
      } else {
        localEnvs[LocalEnvBotKeys.BotId] = ctx.localSettings?.bot?.get(
          LocalSettingsBotKeys.BotId
        ) as string;
        localEnvs[LocalEnvBotKeys.BotPassword] = ctx.localSettings?.bot?.get(
          LocalSettingsBotKeys.BotPassword
        ) as string;
        localEnvs[LocalEnvBotKeys.ClientId] = clientId;
        localEnvs[LocalEnvBotKeys.ClientSecret] = clientSecret;
        localEnvs[LocalEnvBotKeys.TenantID] = teamsAppTenantId;
        localEnvs[LocalEnvBotKeys.OauthAuthority] = "https://login.microsoftonline.com";
        localEnvs[LocalEnvBotKeys.LoginEndpoint] = `${
          ctx.localSettings?.bot?.get(LocalSettingsBotKeys.BotEndpoint) as string
        }/auth-start.html`;
        localEnvs[LocalEnvBotKeys.ApplicationIdUri] = applicationIdUri;
      }

      if (includeBackend) {
        localEnvs[LocalEnvBackendKeys.ApiEndpoint] = localFuncEndpoint;
      }
    }

    // TODO: This is to load .env.teamsfx.local for each component. Remove this after fully supporting custom local debug.
    try {
      const localEnvMultiProvider = new LocalEnvMultiProvider(ctx.root);
      if (includeFrontend) {
        const customEnvs = (
          await localEnvMultiProvider.loadFrontendLocalEnvs(includeBackend, includeAuth)
        ).customizedLocalEnvs;
        this.appendEnvWithPrefix(customEnvs, localEnvs, "FRONTEND_");
      }
      if (includeBackend) {
        const customEnvs = (await localEnvMultiProvider.loadBackendLocalEnvs()).customizedLocalEnvs;
        this.appendEnvWithPrefix(customEnvs, localEnvs, "BACKEND_");
      }
      if (includeBot) {
        const customEnvs = (await localEnvMultiProvider.loadBotLocalEnvs(false))
          .customizedLocalEnvs;
        this.appendEnvWithPrefix(customEnvs, localEnvs, "BOT_");
      }
    } catch (error) {
      ctx.logProvider?.error(`Cannot load .env.teamsfx.local. ${error}`);
    }

    return localEnvs;
  }

  public async executeUserTask(func: Func, ctx: PluginContext): Promise<Result<any, FxError>> {
    if (func.method === "getLocalDebugEnvs") {
      const localEnvs = await this.getLocalDebugEnvs(ctx);
      return ok(localEnvs);
    } else if (func.method === "migrateV1Project") {
      return await this.scaffold(ctx);
    }

    return ok(undefined);
  }

  appendEnvWithPrefix(
    source: { [key: string]: string },
    target: { [key: string]: string },
    prefix: string
  ) {
    for (const key of Object.keys(source)) {
      const prefixKey = `${prefix}${key}`;
      if (target[prefixKey] === undefined || target[prefixKey] === "") {
        // only append and do not override
        target[prefixKey] = source[key];
      }
    }
  }
}

export default new LocalDebugPlugin();
