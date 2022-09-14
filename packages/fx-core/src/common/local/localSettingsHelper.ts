// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {
  ConfigFolderName,
  ConfigMap,
  Json,
  LogProvider,
  ProjectSettings,
  TelemetryReporter,
} from "@microsoft/teamsfx-api";
import * as os from "os";
import {
  LocalSettingsAuthKeys,
  LocalSettingsBackendKeys,
  LocalSettingsBotKeys,
  LocalSettingsFrontendKeys,
  LocalSettingsSimpleAuthKeys,
  LocalSettingsTeamsAppKeys,
} from "../localSettingsConstants";
import { getAllowedAppIds } from "../tools";
import {
  LocalEnvAuthKeys,
  LocalEnvBackendKeys,
  LocalEnvBotKeys,
  LocalEnvCertKeys,
  LocalEnvFrontendKeys,
} from "./constants";
import { LocalEnvManager } from "./localEnvManager";
import { LocalEnvProvider } from "./localEnvProvider";
import { ProjectSettingsHelper } from "./projectSettingsHelper";

function getAuthServiceFolder(): string {
  return `${os.homedir()}/.${ConfigFolderName}/localauth`;
}

function appendEnvWithPrefix(
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

// Note: this may be called before `localDebug` lifecycle, so do not throw if any value is missing
// TODO: mark this as obsolete after supporting new start command.
export async function convertToLocalEnvs(
  projectPath: string,
  projectSettings: ProjectSettings,
  localSettings: Json | undefined,
  logger?: LogProvider
): Promise<Record<string, string>> {
  const includeFrontend = ProjectSettingsHelper.includeFrontend(projectSettings);
  const includeBackend = ProjectSettingsHelper.includeBackend(projectSettings);
  const includeBot = ProjectSettingsHelper.includeBot(projectSettings);
  const includeAAD = ProjectSettingsHelper.includeAAD(projectSettings);
  const includeSimpleAuth = ProjectSettingsHelper.includeSimpleAuth(projectSettings);

  // prepare config maps
  const authConfigs = ConfigMap.fromJSON(localSettings?.auth);
  const backendConfigs = ConfigMap.fromJSON(localSettings?.backend);
  const botConfigs = ConfigMap.fromJSON(localSettings?.bot);
  const frontendConfigs = ConfigMap.fromJSON(localSettings?.frontend);
  const teamsAppConfigs = ConfigMap.fromJSON(localSettings?.teamsApp);

  // get config for local debug
  const clientId = authConfigs?.get(LocalSettingsAuthKeys.ClientId) as string;
  const clientSecret = authConfigs?.get(LocalSettingsAuthKeys.ClientSecret) as string;
  const applicationIdUri = authConfigs?.get(LocalSettingsAuthKeys.ApplicationIdUris) as string;
  const teamsAppTenantId = teamsAppConfigs?.get(LocalSettingsTeamsAppKeys.TenantId) as string;

  const localAuthEndpoint = authConfigs?.get(
    LocalSettingsSimpleAuthKeys.SimpleAuthServiceEndpoint
  ) as string;
  const localTabEndpoint = frontendConfigs?.get(LocalSettingsFrontendKeys.TabEndpoint) as string;
  const localFuncEndpoint = backendConfigs?.get(
    LocalSettingsBackendKeys.FunctionEndpoint
  ) as string;

  const localEnvs: { [key: string]: string } = {};
  if (includeFrontend) {
    localEnvs[LocalEnvFrontendKeys.Browser] = frontendConfigs?.get(
      LocalSettingsFrontendKeys.Browser
    ) as string;
    localEnvs[LocalEnvFrontendKeys.Https] = frontendConfigs?.get(
      LocalSettingsFrontendKeys.Https
    ) as string;
    localEnvs[LocalEnvFrontendKeys.Port] = "53000";

    if (includeAAD) {
      // frontend local envs
      localEnvs[LocalEnvFrontendKeys.LoginUrl] = `${localTabEndpoint}/auth-start.html`;
      localEnvs[LocalEnvFrontendKeys.ClientId] = clientId;
    }

    if (includeSimpleAuth) {
      // frontend local envs
      localEnvs[LocalEnvFrontendKeys.TeamsFxEndpoint] = localAuthEndpoint;

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
      localEnvs[LocalEnvFrontendKeys.FuncName] = projectSettings?.defaultFunctionName as string;
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

    localEnvs[LocalEnvCertKeys.SslCrtFile] = frontendConfigs?.get(
      LocalSettingsFrontendKeys.SslCertFile
    );
    localEnvs[LocalEnvCertKeys.SslKeyFile] = frontendConfigs?.get(
      LocalSettingsFrontendKeys.SslKeyFile
    );
  }

  if (includeBot) {
    // bot local env
    localEnvs[LocalEnvBotKeys.BotId] = botConfigs?.get(LocalSettingsBotKeys.BotId) as string;
    localEnvs[LocalEnvBotKeys.BotPassword] = botConfigs?.get(
      LocalSettingsBotKeys.BotPassword
    ) as string;
    localEnvs[LocalEnvBotKeys.ClientId] = clientId;
    localEnvs[LocalEnvBotKeys.ClientSecret] = clientSecret;
    localEnvs[LocalEnvBotKeys.TenantID] = teamsAppTenantId;
    localEnvs[LocalEnvBotKeys.OauthAuthority] = "https://login.microsoftonline.com";
    localEnvs[LocalEnvBotKeys.LoginEndpoint] = `${
      botConfigs?.get(LocalSettingsBotKeys.BotEndpoint) as string
    }/auth-start.html`;
    localEnvs[LocalEnvBotKeys.ApplicationIdUri] = applicationIdUri;

    if (includeBackend) {
      localEnvs[LocalEnvBackendKeys.ApiEndpoint] = localFuncEndpoint;
    }
  }

  // TODO: This is to load .env.teamsfx.local for each component. Remove this after fully supporting custom local debug.
  try {
    const localEnvProvider = new LocalEnvProvider(projectPath);
    if (includeFrontend) {
      const customEnvs = (await localEnvProvider.loadFrontendLocalEnvs(includeBackend, includeAAD))
        .customizedLocalEnvs;
      appendEnvWithPrefix(customEnvs, localEnvs, "FRONTEND_");
    }
    if (includeBackend) {
      const customEnvs = (await localEnvProvider.loadBackendLocalEnvs()).customizedLocalEnvs;
      appendEnvWithPrefix(customEnvs, localEnvs, "BACKEND_");
    }
    if (includeBot) {
      const customEnvs = (await localEnvProvider.loadBotLocalEnvs()).customizedLocalEnvs;
      appendEnvWithPrefix(customEnvs, localEnvs, "BOT_");
    }
  } catch (error) {
    logger?.error(`Cannot load .env.teamsfx.local. ${error}`);
  }

  return localEnvs;
}

// for telemetry use only
// Used by VSC, CLI & VS
export async function getProjectComponents(
  projectPath: string,
  logger?: LogProvider,
  telemetry?: TelemetryReporter
): Promise<string | undefined> {
  const localEnvManager = new LocalEnvManager(logger, telemetry);
  try {
    const projectSettings = await localEnvManager.getProjectSettings(projectPath);
    const result: { [key: string]: any } = { components: [] };
    if (ProjectSettingsHelper.isSpfx(projectSettings)) {
      result.components.push("spfx");
    }
    if (ProjectSettingsHelper.includeFrontend(projectSettings)) {
      result.components.push("frontend");
    }
    if (ProjectSettingsHelper.includeBot(projectSettings)) {
      result.components.push(`bot`);
      result.botHostType = ProjectSettingsHelper.includeFuncHostedBot(projectSettings)
        ? "azure-functions"
        : "app-service";
      result.botCapabilities = ProjectSettingsHelper.getBotCapabilities(projectSettings);
    }
    if (ProjectSettingsHelper.includeBackend(projectSettings)) {
      result.components.push("backend");
    }
    if (ProjectSettingsHelper.includeAAD(projectSettings)) {
      result.components.push("aad");
    }
    return JSON.stringify(result);
  } catch (error: any) {
    return undefined;
  }
}
