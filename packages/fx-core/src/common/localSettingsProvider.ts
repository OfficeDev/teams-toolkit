// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as fs from "fs-extra";
import * as os from "os";
import { ConfigFolderName, ConfigMap, LocalSettings } from "@microsoft/teamsfx-api";
import {
  LocalSettingsAuthKeys,
  LocalSettingsBackendKeys,
  LocalSettingsBotKeys,
  LocalSettingsFrontendKeys,
  LocalSettingsTeamsAppKeys,
} from "./localSettingsConstants";

export const localSettingsFileName = "localSettings.json";

export class LocalSettingsProvider {
  public readonly localSettingsFilePath: string;
  constructor(workspaceFolder: string) {
    this.localSettingsFilePath = `${workspaceFolder}/.${ConfigFolderName}/${localSettingsFileName}`;
  }

  public init(
    includeFrontend: boolean,
    includeBackend: boolean,
    includeBot: boolean
  ): LocalSettings {
    // initialize Teams app related config for local debug.
    const teamsAppLocalConfig = new ConfigMap();
    teamsAppLocalConfig.set(LocalSettingsTeamsAppKeys.TenantId, "");
    teamsAppLocalConfig.set(LocalSettingsTeamsAppKeys.TeamsAppId, "");

    const localSettings: LocalSettings = {
      teamsApp: teamsAppLocalConfig,
    };

    let keys: string[];

    // initialize frontend and simplee auth local settings.
    if (includeFrontend) {
      const frontendLocalConfig = new ConfigMap();
      frontendLocalConfig.set(LocalSettingsFrontendKeys.Browser, "none");
      frontendLocalConfig.set(LocalSettingsFrontendKeys.Https, true);
      frontendLocalConfig.set(LocalSettingsFrontendKeys.TrustDevCert, true);
      frontendLocalConfig.set(LocalSettingsFrontendKeys.SslCertFile, "");
      frontendLocalConfig.set(LocalSettingsFrontendKeys.SslKeyFile, "");
      frontendLocalConfig.set(LocalSettingsFrontendKeys.TabDomain, "");
      frontendLocalConfig.set(LocalSettingsFrontendKeys.TabEndpoint, "");

      // simple auth is only required by frontend
      const authLocalConfig = new ConfigMap();
      keys = Object.values(LocalSettingsAuthKeys);
      for (const key of keys) {
        authLocalConfig.set(key, "");
      }

      localSettings.frontend = frontendLocalConfig;
      localSettings.auth = authLocalConfig;
    }

    // initialize simple auth local settings.
    if (includeBackend) {
      const backendLocalConfig = new ConfigMap();
      keys = Object.values(LocalSettingsBackendKeys);
      for (const key of keys) {
        backendLocalConfig.set(key, "");
      }

      localSettings.backend = backendLocalConfig;
    }

    if (includeBot) {
      const botLocalConfig = new ConfigMap();
      keys = Object.values(LocalSettingsBotKeys);
      for (const key of keys) {
        if (key === LocalSettingsBotKeys.SkipNgrok) {
          botLocalConfig.set(key, false);
        } else {
          botLocalConfig.set(key, "");
        }
      }

      localSettings.bot = botLocalConfig;
    }

    return localSettings;
  }

  public async load(): Promise<LocalSettings | undefined> {
    if (await fs.pathExists(this.localSettingsFilePath)) {
      const localSettingsJson = await fs.readJSON(this.localSettingsFilePath);
      const localSettings: LocalSettings = {
        teamsApp: ConfigMap.fromJSON(localSettingsJson.teamsApp)!,
        auth: ConfigMap.fromJSON(localSettingsJson.auth),
        frontend: ConfigMap.fromJSON(localSettingsJson.frontend),
        backend: ConfigMap.fromJSON(localSettingsJson.backend),
        bot: ConfigMap.fromJSON(localSettingsJson.bot),
      };

      return localSettings;
    } else {
      return undefined;
    }
  }

  public async save(localSettings: LocalSettings): Promise<void> {
    await fs.createFile(this.localSettingsFilePath);
    await fs.writeFile(this.localSettingsFilePath, JSON.stringify(localSettings, null, 4));
  }
}
