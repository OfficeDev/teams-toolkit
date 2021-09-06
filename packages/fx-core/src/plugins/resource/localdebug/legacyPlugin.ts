// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {
  err,
  FxError,
  ok,
  Platform,
  PluginContext,
  Result,
  VsCodeEnv,
} from "@microsoft/teamsfx-api";
import { getAllowedAppIds } from "../../../common/tools";
import { LocalCertificateManager } from "./certificate";
import {
  AadPlugin,
  BotPlugin,
  LocalDebugConfigKeys,
  LocalEnvAuthKeys,
  LocalEnvBackendKeys,
  LocalEnvBotKeys,
  LocalEnvCertKeys,
  LocalEnvFrontendKeys,
  LocalEnvBotKeysMigratedFromV1,
  RuntimeConnectorPlugin,
  SolutionPlugin,
} from "./constants";
import { LocalEnvProvider } from "./localEnv";
import { ProjectSettingLoader } from "./projectSettingLoader";
import { getCodespaceName, getCodespaceUrl } from "./util/codespace";
import {
  InvalidLocalBotEndpointFormat,
  LocalBotEndpointNotConfigured,
  NgrokTunnelNotConnected,
} from "./util/error";
import { prepareLocalAuthService } from "./util/localService";
import { getNgrokHttpUrl } from "./util/ngrok";
import { TelemetryEventName, TelemetryUtils } from "./util/telemetry";

export class legacyLocalDebugPlugin {
  public static async localDebug(ctx: PluginContext): Promise<Result<any, FxError>> {
    const vscEnv = ctx.answers?.vscodeEnv;
    const includeFrontend = ProjectSettingLoader.includeFrontend(ctx);
    const includeBackend = ProjectSettingLoader.includeBackend(ctx);
    const includeBot = ProjectSettingLoader.includeBot(ctx);
    const includeAuth = ProjectSettingLoader.includeAuth(ctx);
    let skipNgrok = ctx.config?.get(LocalDebugConfigKeys.SkipNgrok) as string;

    const telemetryProperties = {
      platform: ctx.answers?.platform as string,
      vscenv: vscEnv as string,
      frontend: includeFrontend ? "true" : "false",
      function: includeBackend ? "true" : "false",
      bot: includeBot ? "true" : "false",
      "skip-ngrok": skipNgrok,
    };
    TelemetryUtils.init(ctx);
    TelemetryUtils.sendStartEvent(TelemetryEventName.localDebug, telemetryProperties);

    // setup configs used by other plugins
    // TODO: dynamicly determine local ports
    if (ctx.answers?.platform === Platform.VSCode || ctx.answers?.platform === Platform.CLI) {
      let localTabEndpoint: string;
      let localTabDomain: string;
      let localAuthEndpoint: string;
      let localFuncEndpoint: string;

      if (vscEnv === VsCodeEnv.codespaceBrowser || vscEnv === VsCodeEnv.codespaceVsCode) {
        const codespaceName = await getCodespaceName();

        localTabEndpoint = getCodespaceUrl(codespaceName, 3000);
        localTabDomain = new URL(localTabEndpoint).host;
        localAuthEndpoint = getCodespaceUrl(codespaceName, 5000);
        localFuncEndpoint = getCodespaceUrl(codespaceName, 7071);
      } else {
        localTabDomain = "localhost";
        localTabEndpoint = "https://localhost:3000";
        localAuthEndpoint = "http://localhost:5000";
        localFuncEndpoint = "http://localhost:7071";
      }

      if (includeAuth) {
        ctx.config.set(LocalDebugConfigKeys.LocalAuthEndpoint, localAuthEndpoint);
      }

      if (includeFrontend) {
        ctx.config.set(LocalDebugConfigKeys.LocalTabEndpoint, localTabEndpoint);
        ctx.config.set(LocalDebugConfigKeys.LocalTabDomain, localTabDomain);
      }

      if (includeBackend) {
        ctx.config.set(LocalDebugConfigKeys.LocalFunctionEndpoint, localFuncEndpoint);
      }

      if (includeBot) {
        if (skipNgrok === undefined) {
          skipNgrok = "false";
          ctx.config.set(LocalDebugConfigKeys.SkipNgrok, skipNgrok);
        }
        if (skipNgrok?.trim().toLowerCase() === "true") {
          const localBotEndpoint = ctx.config.get(LocalDebugConfigKeys.LocalBotEndpoint) as string;
          if (localBotEndpoint === undefined) {
            const error = LocalBotEndpointNotConfigured();
            TelemetryUtils.sendErrorEvent(TelemetryEventName.localDebug, error);
            return err(error);
          }
          const botEndpointRegex = /https:\/\/.*(:\d+)?/g;
          if (!botEndpointRegex.test(localBotEndpoint)) {
            const error = InvalidLocalBotEndpointFormat(localBotEndpoint);
            TelemetryUtils.sendErrorEvent(TelemetryEventName.localDebug, error);
            return err(error);
          }
          ctx.config.set(LocalDebugConfigKeys.LocalBotEndpoint, localBotEndpoint);
          ctx.config.set(LocalDebugConfigKeys.LocalBotDomain, localBotEndpoint.slice(8));
        } else {
          const ngrokHttpUrl = await getNgrokHttpUrl(3978);
          if (!ngrokHttpUrl) {
            const error = NgrokTunnelNotConnected();
            TelemetryUtils.sendErrorEvent(TelemetryEventName.localDebug, error);
            return err(error);
          } else {
            ctx.config.set(LocalDebugConfigKeys.LocalBotEndpoint, ngrokHttpUrl);
            ctx.config.set(LocalDebugConfigKeys.LocalBotDomain, ngrokHttpUrl.slice(8));
          }
        }
      }
    }

    TelemetryUtils.sendSuccessEvent(TelemetryEventName.localDebug, telemetryProperties);
    return ok(undefined);
  }

  public static async postLocalDebug(ctx: PluginContext): Promise<Result<any, FxError>> {
    const includeFrontend = ProjectSettingLoader.includeFrontend(ctx);
    const includeBackend = ProjectSettingLoader.includeBackend(ctx);
    const includeBot = ProjectSettingLoader.includeBot(ctx);
    const includeAuth = ProjectSettingLoader.includeAuth(ctx);
    let trustDevCert = ctx.config?.get(LocalDebugConfigKeys.TrustDevelopmentCertificate) as string;

    const telemetryProperties = {
      platform: ctx.answers?.platform as string,
      frontend: includeFrontend ? "true" : "false",
      function: includeBackend ? "true" : "false",
      bot: includeBot ? "true" : "false",
      auth: includeAuth ? "true" : "false",
      "trust-development-certificate": trustDevCert,
    };
    TelemetryUtils.init(ctx);
    TelemetryUtils.sendStartEvent(TelemetryEventName.postLocalDebug, telemetryProperties);

    if (ctx.answers?.platform === Platform.VSCode || ctx.answers?.platform === Platform.CLI) {
      const isMigrateFromV1 = ProjectSettingLoader.isMigrateFromV1(ctx);

      const localEnvProvider = new LocalEnvProvider(ctx.root);
      const localEnvs = await localEnvProvider.loadLocalEnv(
        includeFrontend,
        includeBackend,
        includeBot,
        includeAuth,
        isMigrateFromV1
      );

      // configs
      const localDebugConfigs = ctx.config;
      const aadConfigs = ctx.envInfo.profile.get(AadPlugin.Name);
      const runtimeConnectorConfigs = ctx.envInfo.profile.get(RuntimeConnectorPlugin.Name);
      const solutionConfigs = ctx.envInfo.profile.get(SolutionPlugin.Name);
      const clientId = aadConfigs?.get(AadPlugin.LocalClientId) as string;
      const clientSecret = aadConfigs?.get(AadPlugin.LocalClientSecret) as string;
      const teamsAppTenantId = solutionConfigs?.get(SolutionPlugin.TeamsAppTenantId) as string;
      const localAuthPackagePath = runtimeConnectorConfigs?.get(
        RuntimeConnectorPlugin.FilePath
      ) as string;

      if (includeFrontend) {
        if (includeAuth) {
          // frontend local envs
          localEnvs[LocalEnvFrontendKeys.TeamsFxEndpoint] = localDebugConfigs.get(
            LocalDebugConfigKeys.LocalAuthEndpoint
          ) as string;
          localEnvs[LocalEnvFrontendKeys.LoginUrl] = `${
            localDebugConfigs.get(LocalDebugConfigKeys.LocalTabEndpoint) as string
          }/auth-start.html`;
          localEnvs[LocalEnvFrontendKeys.ClientId] = clientId;

          // auth local envs (auth is only required by frontend)
          localEnvs[LocalEnvAuthKeys.ClientId] = clientId;
          localEnvs[LocalEnvAuthKeys.ClientSecret] = clientSecret;
          localEnvs[LocalEnvAuthKeys.IdentifierUri] = aadConfigs?.get(
            AadPlugin.LocalAppIdUri
          ) as string;
          localEnvs[
            LocalEnvAuthKeys.AadMetadataAddress
          ] = `https://login.microsoftonline.com/${teamsAppTenantId}/v2.0/.well-known/openid-configuration`;
          localEnvs[
            LocalEnvAuthKeys.OauthAuthority
          ] = `https://login.microsoftonline.com/${teamsAppTenantId}`;
          localEnvs[LocalEnvAuthKeys.TabEndpoint] = localDebugConfigs.get(
            LocalDebugConfigKeys.LocalTabEndpoint
          ) as string;
          localEnvs[LocalEnvAuthKeys.AllowedAppIds] = getAllowedAppIds().join(";");
          localEnvs[LocalEnvAuthKeys.ServicePath] = await prepareLocalAuthService(
            localAuthPackagePath
          );
        }

        if (includeBackend) {
          localEnvs[LocalEnvFrontendKeys.FuncEndpoint] = localDebugConfigs.get(
            LocalDebugConfigKeys.LocalFunctionEndpoint
          ) as string;
          localEnvs[LocalEnvFrontendKeys.FuncName] = ctx.projectSettings
            ?.defaultFunctionName as string;

          // function local envs
          localEnvs[LocalEnvBackendKeys.ClientId] = clientId;
          localEnvs[LocalEnvBackendKeys.ClientSecret] = clientSecret;
          localEnvs[LocalEnvBackendKeys.AuthorityHost] = "https://login.microsoftonline.com";
          localEnvs[LocalEnvBackendKeys.TenantId] = teamsAppTenantId;
          localEnvs[LocalEnvBackendKeys.ApiEndpoint] = localDebugConfigs.get(
            LocalDebugConfigKeys.LocalFunctionEndpoint
          ) as string;
          localEnvs[LocalEnvBackendKeys.ApplicationIdUri] = aadConfigs?.get(
            AadPlugin.LocalAppIdUri
          ) as string;
          localEnvs[LocalEnvBackendKeys.AllowedAppIds] = getAllowedAppIds().join(";");
        }

        // local certificate
        try {
          if (trustDevCert === undefined) {
            trustDevCert = "true";
            ctx.config.set(LocalDebugConfigKeys.TrustDevelopmentCertificate, trustDevCert);
          }
          const needTrust = trustDevCert.trim().toLowerCase() === "true";
          const certManager = new LocalCertificateManager(ctx);
          const localCert = await certManager.setupCertificate(needTrust);
          if (localCert) {
            localEnvs[LocalEnvCertKeys.SslCrtFile] = localCert.certPath;
            localEnvs[LocalEnvCertKeys.SslKeyFile] = localCert.keyPath;
          }
        } catch (error) {
          // do not break if cert error
        }
      }

      if (includeBot) {
        // bot local env
        const botConfigs = ctx.envInfo.profile.get(BotPlugin.Name);
        if (isMigrateFromV1) {
          localEnvs[LocalEnvBotKeysMigratedFromV1.BotId] = botConfigs?.get(
            BotPlugin.LocalBotId
          ) as string;
          localEnvs[LocalEnvBotKeysMigratedFromV1.BotPassword] = botConfigs?.get(
            BotPlugin.LocalBotPassword
          ) as string;
        } else {
          localEnvs[LocalEnvBotKeys.BotId] = botConfigs?.get(BotPlugin.LocalBotId) as string;
          localEnvs[LocalEnvBotKeys.BotPassword] = botConfigs?.get(
            BotPlugin.LocalBotPassword
          ) as string;
          localEnvs[LocalEnvBotKeys.ClientId] = clientId;
          localEnvs[LocalEnvBotKeys.ClientSecret] = clientSecret;
          localEnvs[LocalEnvBotKeys.TenantID] = teamsAppTenantId;
          localEnvs[LocalEnvBotKeys.OauthAuthority] = "https://login.microsoftonline.com";
          localEnvs[LocalEnvBotKeys.LoginEndpoint] = `${
            localDebugConfigs.get(LocalDebugConfigKeys.LocalBotEndpoint) as string
          }/auth-start.html`;
          localEnvs[LocalEnvBotKeys.ApplicationIdUri] = aadConfigs?.get(
            AadPlugin.LocalAppIdUri
          ) as string;
        }

        if (includeBackend) {
          localEnvs[LocalEnvBackendKeys.ApiEndpoint] = localDebugConfigs.get(
            LocalDebugConfigKeys.LocalFunctionEndpoint
          ) as string;
        }
      }

      await localEnvProvider.saveLocalEnv(localEnvs);
    }

    TelemetryUtils.sendSuccessEvent(TelemetryEventName.postLocalDebug, telemetryProperties);
    return ok(undefined);
  }
}
