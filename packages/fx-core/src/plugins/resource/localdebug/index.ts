// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {
  Func,
  FxError,
  Platform,
  Plugin,
  PluginContext,
  Result,
  err,
  ok,
  VsCodeEnv,
  AzureSolutionSettings,
  Void,
} from "@microsoft/teamsfx-api";

import { LocalCertificateManager } from "./certificate";
import {
  EnvKeysFrontend,
  EnvKeysBackend,
  EnvKeysBot,
  EnvKeysBotV1,
  LocalEnvMultiProvider,
} from "./localEnvMulti";
import { prepareLocalAuthService } from "./util/localService";
import { TelemetryUtils, TelemetryEventName } from "./util/telemetry";
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
    const includeFrontend = ProjectSettingLoader.includeFrontend(ctx);
    const includeBackend = ProjectSettingLoader.includeBackend(ctx);
    const includeBot = ProjectSettingLoader.includeBot(ctx);
    const includeAuth = ProjectSettingLoader.includeAuth(ctx);
    let trustDevCert = ctx.localSettings?.frontend?.get(LocalSettingsFrontendKeys.TrustDevCert) as
      | boolean
      | undefined;

    const telemetryProperties = {
      platform: ctx.answers?.platform as string,
      frontend: includeFrontend ? "true" : "false",
      function: includeBackend ? "true" : "false",
      bot: includeBot ? "true" : "false",
      auth: includeAuth ? "true" : "false",
      "trust-development-certificate": trustDevCert + "",
    };
    TelemetryUtils.init(ctx);
    TelemetryUtils.sendStartEvent(TelemetryEventName.postLocalDebug, telemetryProperties);

    if (ctx.answers?.platform === Platform.VSCode || ctx.answers?.platform === Platform.CLI) {
      const isMigrateFromV1 = ProjectSettingLoader.isMigrateFromV1(ctx);

      const localEnvMultiProvider = new LocalEnvMultiProvider(ctx.root);
      const frontendEnvs = includeFrontend
        ? await localEnvMultiProvider.loadFrontendLocalEnvs(includeBackend, includeAuth)
        : undefined;
      const backendEnvs = includeBackend
        ? await localEnvMultiProvider.loadBackendLocalEnvs()
        : undefined;
      const botEnvs = includeBot
        ? await localEnvMultiProvider.loadBotLocalEnvs(isMigrateFromV1)
        : undefined;

      // get config for local debug
      const clientId = ctx.localSettings?.auth?.get(LocalSettingsAuthKeys.ClientId) as string;
      const clientSecret = ctx.localSettings?.auth?.get(
        LocalSettingsAuthKeys.ClientSecret
      ) as string;
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

      const localAuthPackagePath = ctx.localSettings?.auth?.get(
        LocalSettingsAuthKeys.SimpleAuthFilePath
      ) as string;

      if (includeFrontend) {
        if (includeAuth) {
          frontendEnvs!.teamsfxLocalEnvs[EnvKeysFrontend.TeamsFxEndpoint] = localAuthEndpoint;
          frontendEnvs!.teamsfxLocalEnvs[
            EnvKeysFrontend.LoginUrl
          ] = `${localTabEndpoint}/auth-start.html`;
          frontendEnvs!.teamsfxLocalEnvs[EnvKeysFrontend.ClientId] = clientId;
          await prepareLocalAuthService(localAuthPackagePath);
        }

        if (includeBackend) {
          frontendEnvs!.teamsfxLocalEnvs[EnvKeysFrontend.FuncEndpoint] = localFuncEndpoint;
          frontendEnvs!.teamsfxLocalEnvs[EnvKeysFrontend.FuncName] = ctx.projectSettings
            ?.defaultFunctionName as string;

          backendEnvs!.teamsfxLocalEnvs[EnvKeysBackend.FuncWorkerRuntime] = "node";
          backendEnvs!.teamsfxLocalEnvs[EnvKeysBackend.ClientId] = clientId;
          backendEnvs!.teamsfxLocalEnvs[EnvKeysBackend.ClientSecret] = clientSecret;
          backendEnvs!.teamsfxLocalEnvs[EnvKeysBackend.AuthorityHost] =
            "https://login.microsoftonline.com";
          backendEnvs!.teamsfxLocalEnvs[EnvKeysBackend.TenantId] = teamsAppTenantId;
          backendEnvs!.teamsfxLocalEnvs[EnvKeysBackend.ApiEndpoint] = localFuncEndpoint;
          backendEnvs!.teamsfxLocalEnvs[EnvKeysBackend.ApplicationIdUri] = applicationIdUri;
          backendEnvs!.teamsfxLocalEnvs[EnvKeysBackend.AllowedAppIds] =
            getAllowedAppIds().join(";");
        }

        // setup local certificate
        try {
          if (trustDevCert === undefined) {
            trustDevCert = true;
            ctx.localSettings?.frontend?.set(LocalSettingsFrontendKeys.TrustDevCert, trustDevCert);
          }

          const certManager = new LocalCertificateManager(ctx);
          const localCert = await certManager.setupCertificate(trustDevCert);
          if (localCert) {
            ctx.localSettings?.frontend?.set(
              LocalSettingsFrontendKeys.SslCertFile,
              localCert.certPath
            );
            ctx.localSettings?.frontend?.set(
              LocalSettingsFrontendKeys.SslKeyFile,
              localCert.keyPath
            );
            frontendEnvs!.teamsfxLocalEnvs[EnvKeysFrontend.SslCrtFile] = localCert.certPath;
            frontendEnvs!.teamsfxLocalEnvs[EnvKeysFrontend.SslKeyFile] = localCert.keyPath;
          }
        } catch (error) {
          // do not break if cert error
        }
      }

      if (includeBot) {
        const botId = ctx.localSettings?.bot?.get(LocalSettingsBotKeys.BotId) as string;
        const botPassword = ctx.localSettings?.bot?.get(LocalSettingsBotKeys.BotPassword) as string;
        if (isMigrateFromV1) {
          botEnvs!.teamsfxLocalEnvs[EnvKeysBotV1.BotId] = botId;
          botEnvs!.teamsfxLocalEnvs[EnvKeysBotV1.BotPassword] = botPassword;
        } else {
          botEnvs!.teamsfxLocalEnvs[EnvKeysBot.BotId] = botId;
          botEnvs!.teamsfxLocalEnvs[EnvKeysBot.BotPassword] = botPassword;
          botEnvs!.teamsfxLocalEnvs[EnvKeysBot.ClientId] = clientId;
          botEnvs!.teamsfxLocalEnvs[EnvKeysBot.ClientSecret] = clientSecret;
          botEnvs!.teamsfxLocalEnvs[EnvKeysBot.TenantID] = teamsAppTenantId;
          botEnvs!.teamsfxLocalEnvs[EnvKeysBot.OauthAuthority] =
            "https://login.microsoftonline.com";
          botEnvs!.teamsfxLocalEnvs[EnvKeysBot.LoginEndpoint] = `${
            ctx.localSettings?.bot?.get(LocalSettingsBotKeys.BotEndpoint) as string
          }/auth-start.html`;
          botEnvs!.teamsfxLocalEnvs[EnvKeysBot.ApplicationIdUri] = applicationIdUri;
        }

        if (includeBackend) {
          backendEnvs!.teamsfxLocalEnvs[EnvKeysBackend.ApiEndpoint] = localFuncEndpoint;
          botEnvs!.teamsfxLocalEnvs[EnvKeysBot.ApiEndpoint] = localFuncEndpoint;
        }
      }

      // save .env.teamsfx.local
      await localEnvMultiProvider.saveLocalEnvs(frontendEnvs, backendEnvs, botEnvs);
    }

    return ok(undefined);
  }

  public async executeUserTask(func: Func, ctx: PluginContext): Promise<Result<any, FxError>> {
    if (func.method === "migrateV1Project") {
      return await this.scaffold(ctx);
    }

    return ok(undefined);
  }
}

export default new LocalDebugPlugin();
