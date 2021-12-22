// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { ConfigFolderName, Json, LogProvider, ProjectSettings } from "@microsoft/teamsfx-api";
import * as os from "os";
import { getAllowedAppIds } from "../tools";
import {
  LocalEnvAuthKeys,
  LocalEnvBackendKeys,
  LocalEnvBotKeys,
  LocalEnvCertKeys,
  LocalEnvFrontendKeys,
  LocalEnvBotKeysMigratedFromV1,
  LocalSettingsAuthKeys,
  LocalSettingsBackendKeys,
  LocalSettingsBotKeys,
  LocalSettingsFrontendKeys,
  LocalSettingsTeamsAppKeys,
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
  localSettings: Json | undefined,
  logger?: LogProvider
): Promise<Record<string, string>> {
  const includeFrontend = ProjectSettingsHelper.includeFrontend(projectSettings);
  const includeBackend = ProjectSettingsHelper.includeBackend(projectSettings);
  const includeBot = ProjectSettingsHelper.includeBot(projectSettings);
  const includeAuth = ProjectSettingsHelper.includeAuth(projectSettings);

  // get config for local debug
  const clientId = localSettings?.auth?.get(LocalSettingsAuthKeys.ClientId) as string;
  const clientSecret = localSettings?.auth?.get(LocalSettingsAuthKeys.ClientSecret) as string;
  const applicationIdUri = localSettings?.auth?.get(
    LocalSettingsAuthKeys.ApplicationIdUris
  ) as string;
  const teamsAppTenantId = localSettings?.teamsApp?.get(
    LocalSettingsTeamsAppKeys.TenantId
  ) as string;

  const localAuthEndpoint = localSettings?.auth?.get(
    LocalSettingsAuthKeys.SimpleAuthServiceEndpoint
  ) as string;
  const localTabEndpoint = localSettings?.frontend?.get(
    LocalSettingsFrontendKeys.TabEndpoint
  ) as string;
  const localFuncEndpoint = localSettings?.backend?.get(
    LocalSettingsBackendKeys.FunctionEndpoint
  ) as string;

  const localEnvs: { [key: string]: string } = {};
  if (includeFrontend) {
    localEnvs[LocalEnvFrontendKeys.Browser] = localSettings?.frontend?.get(
      LocalSettingsFrontendKeys.Browser
    ) as string;
    localEnvs[LocalEnvFrontendKeys.Https] = localSettings?.frontend?.get(
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

    localEnvs[LocalEnvCertKeys.SslCrtFile] = localSettings?.frontend?.get(
      LocalSettingsFrontendKeys.SslCertFile
    );
    localEnvs[LocalEnvCertKeys.SslKeyFile] = localSettings?.frontend?.get(
      LocalSettingsFrontendKeys.SslKeyFile
    );
  }

  if (includeBot) {
    // bot local env
    if (ProjectSettingsHelper.isMigrateFromV1(projectSettings)) {
      localEnvs[LocalEnvBotKeysMigratedFromV1.BotId] = localSettings?.bot?.get(
        LocalSettingsBotKeys.BotId
      ) as string;
      localEnvs[LocalEnvBotKeysMigratedFromV1.BotPassword] = localSettings?.bot?.get(
        LocalSettingsBotKeys.BotPassword
      ) as string;
    } else {
      localEnvs[LocalEnvBotKeys.BotId] = localSettings?.bot?.get(
        LocalSettingsBotKeys.BotId
      ) as string;
      localEnvs[LocalEnvBotKeys.BotPassword] = localSettings?.bot?.get(
        LocalSettingsBotKeys.BotPassword
      ) as string;
      localEnvs[LocalEnvBotKeys.ClientId] = clientId;
      localEnvs[LocalEnvBotKeys.ClientSecret] = clientSecret;
      localEnvs[LocalEnvBotKeys.TenantID] = teamsAppTenantId;
      localEnvs[LocalEnvBotKeys.OauthAuthority] = "https://login.microsoftonline.com";
      localEnvs[LocalEnvBotKeys.LoginEndpoint] = `${
        localSettings?.bot?.get(LocalSettingsBotKeys.BotEndpoint) as string
      }/auth-start.html`;
      localEnvs[LocalEnvBotKeys.ApplicationIdUri] = applicationIdUri;
    }

    if (includeBackend) {
      localEnvs[LocalEnvBackendKeys.ApiEndpoint] = localFuncEndpoint;
    }
  }

  // TODO: This is to load .env.teamsfx.local for each component. Remove this after fully supporting custom local debug.
  try {
    const localEnvProvider = new LocalEnvProvider(projectPath);
    if (includeFrontend) {
      const customEnvs = (await localEnvProvider.loadFrontendLocalEnvs(includeBackend, includeAuth))
        .customizedLocalEnvs;
      appendEnvWithPrefix(customEnvs, localEnvs, "FRONTEND_");
    }
    if (includeBackend) {
      const customEnvs = (await localEnvProvider.loadBackendLocalEnvs()).customizedLocalEnvs;
      appendEnvWithPrefix(customEnvs, localEnvs, "BACKEND_");
    }
    if (includeBot) {
      const customEnvs = (await localEnvProvider.loadBotLocalEnvs(false)).customizedLocalEnvs;
      appendEnvWithPrefix(customEnvs, localEnvs, "BOT_");
    }
  } catch (error) {
    logger?.error(`Cannot load .env.teamsfx.local. ${error}`);
  }

  return localEnvs;
}
