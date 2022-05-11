// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {
  ConfigFolderName,
  ConfigMap,
  LogProvider,
  ProjectSettings,
  v2,
} from "@microsoft/teamsfx-api";
import * as os from "os";
import { ResourcePlugins } from "../constants";
import {
  LocalStateAuthKeys,
  LocalStateBackendKeys,
  LocalStateBotKeys,
  LocalStateFrontendKeys,
  LocalStateSimpleAuthKeys,
  LocalStateTeamsAppKeys,
} from "../localStateConstants";
import { getAllowedAppIds } from "../tools";
import {
  LocalEnvAuthKeys,
  LocalEnvBackendKeys,
  LocalEnvBotKeys,
  LocalEnvCertKeys,
  LocalEnvFrontendKeys,
} from "./constants";
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
  envInfo: v2.EnvInfoV2 | undefined,
  logger?: LogProvider
): Promise<Record<string, string>> {
  const localState = envInfo?.state;
  const localConfig = envInfo?.config;

  const includeFrontend = ProjectSettingsHelper.includeFrontend(projectSettings);
  const includeBackend = ProjectSettingsHelper.includeBackend(projectSettings);
  const includeBot = ProjectSettingsHelper.includeBot(projectSettings);
  const includeAAD = ProjectSettingsHelper.includeAAD(projectSettings);
  const includeSimpleAuth = ProjectSettingsHelper.includeSimpleAuth(projectSettings);

  // prepare config maps
  const authConfigs = ConfigMap.fromJSON(localState?.[ResourcePlugins.Aad]);
  const backendConfigs = ConfigMap.fromJSON(localState?.[ResourcePlugins.Function]);
  const botConfigs = ConfigMap.fromJSON(localState?.[ResourcePlugins.Bot]);
  const frontendConfigs = ConfigMap.fromJSON(localState?.[ResourcePlugins.FrontendHosting]);
  const appStudioConfigs = ConfigMap.fromJSON(localState?.[ResourcePlugins.AppStudio]);
  const simpleAuthConfigs = ConfigMap.fromJSON(localState?.[ResourcePlugins.SimpleAuth]);

  // get config for local debug
  const clientId = authConfigs?.get(LocalStateAuthKeys.ClientId) as string;
  const clientSecret = authConfigs?.get(LocalStateAuthKeys.ClientSecret) as string;
  const applicationIdUri = authConfigs?.get(LocalStateAuthKeys.ApplicationIdUris) as string;
  const teamsAppTenantId = authConfigs?.get(LocalStateAuthKeys.TenantId) as string;

  const localAuthEndpoint = simpleAuthConfigs?.get(LocalStateSimpleAuthKeys.Endpoint) as string;
  const localTabEndpoint = frontendConfigs?.get(LocalStateFrontendKeys.Endpoint) as string;
  const localFuncEndpoint = backendConfigs?.get(LocalStateBackendKeys.FunctionEndpoint) as string;

  const localEnvs: { [key: string]: string } = {};
  if (includeFrontend) {
    localEnvs[LocalEnvFrontendKeys.Browser] = frontendConfigs?.get(
      LocalStateFrontendKeys.Browser
    ) as string;
    if (localEnvs[LocalEnvFrontendKeys.Browser] === undefined) {
      localEnvs[LocalEnvFrontendKeys.Browser] = "none";
    }
    localEnvs[LocalEnvFrontendKeys.Https] = frontendConfigs?.get(
      LocalStateFrontendKeys.Https
    ) as string;
    if (localEnvs[LocalEnvFrontendKeys.Https] === undefined) {
      localEnvs[LocalEnvFrontendKeys.Https] = "true";
    }
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

    if (
      frontendConfigs &&
      frontendConfigs.get(LocalStateFrontendKeys.SslCertFile) &&
      frontendConfigs.get(LocalStateFrontendKeys.SslKeyFile)
    ) {
      localEnvs[LocalEnvCertKeys.SslCrtFile] = frontendConfigs.get(
        LocalStateFrontendKeys.SslCertFile
      );
      localEnvs[LocalEnvCertKeys.SslKeyFile] = frontendConfigs.get(
        LocalStateFrontendKeys.SslKeyFile
      );
    }

    if (
      localConfig?.frontend &&
      localConfig.frontend.sslCertFile &&
      localConfig.frontend.sslKeyFile
    ) {
      localEnvs[LocalEnvCertKeys.SslCrtFile] = localConfig.frontend.sslCertFile;
      localEnvs[LocalEnvCertKeys.SslKeyFile] = localConfig.frontend.sslKeyFile;
    }
  }

  if (includeBot) {
    // bot local env
    localEnvs[LocalEnvBotKeys.BotId] = botConfigs?.get(LocalStateBotKeys.BotId) as string;
    localEnvs[LocalEnvBotKeys.BotPassword] = botConfigs?.get(
      LocalStateBotKeys.BotPassword
    ) as string;
    localEnvs[LocalEnvBotKeys.ClientId] = clientId;
    localEnvs[LocalEnvBotKeys.ClientSecret] = clientSecret;
    localEnvs[LocalEnvBotKeys.TenantID] = teamsAppTenantId;
    localEnvs[LocalEnvBotKeys.OauthAuthority] = "https://login.microsoftonline.com";
    localEnvs[LocalEnvBotKeys.LoginEndpoint] = `${
      botConfigs?.get(LocalStateBotKeys.BotEndpoint) as string
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
