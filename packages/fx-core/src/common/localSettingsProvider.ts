// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as fs from "fs-extra";
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

    // initialize frontend and simple auth local settings.
    if (includeFrontend) {
      localSettings.frontend = this.initFrontend();
      localSettings.auth = this.initSimpleAuth();
    }

    // initialize backend local settings.
    if (includeBackend) {
      localSettings.backend = this.initBackend();
    }

    // initialize bot local settings.
    if (includeBot) {
      localSettings.bot = this.initBot();
    }

    return localSettings;
  }

  public incrementalInit(localSettings: LocalSettings, addBackaned: boolean, addBot: boolean): LocalSettings {
    if (!(localSettings.backend) && addBackaned) {
      localSettings.backend = this.initBackend();
    }

    if (!(localSettings.bot) && addBot) {
      localSettings.bot = this.initBot();
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

  initSimpleAuth(): ConfigMap {
    // simple auth is only required by frontend
    const authLocalConfig = new ConfigMap();
    const keys = Object.values(LocalSettingsAuthKeys);
    for (const key of keys) {
      authLocalConfig.set(key, "");
    }

    return authLocalConfig;
  }

  initFrontend(): ConfigMap {
    const frontendLocalConfig = new ConfigMap();
    frontendLocalConfig.set(LocalSettingsFrontendKeys.Browser, "none");
    frontendLocalConfig.set(LocalSettingsFrontendKeys.Https, true);
    frontendLocalConfig.set(LocalSettingsFrontendKeys.TrustDevCert, true);
    frontendLocalConfig.set(LocalSettingsFrontendKeys.SslCertFile, "");
    frontendLocalConfig.set(LocalSettingsFrontendKeys.SslKeyFile, "");
    frontendLocalConfig.set(LocalSettingsFrontendKeys.TabDomain, "");
    frontendLocalConfig.set(LocalSettingsFrontendKeys.TabEndpoint, "");

    return frontendLocalConfig;
  }

  initBackend(): ConfigMap {
    const backendLocalConfig = new ConfigMap();
    const keys = Object.values(LocalSettingsBackendKeys);
    for (const key of keys) {
      backendLocalConfig.set(key, "");
    }

    return backendLocalConfig;
  }

  initBot(): ConfigMap {
    const botLocalConfig = new ConfigMap();
    const keys = Object.values(LocalSettingsBotKeys);
    for (const key of keys) {
      if (key === LocalSettingsBotKeys.SkipNgrok) {
        botLocalConfig.set(key, false);
      } else {
        botLocalConfig.set(key, "");
      }
    }

    return botLocalConfig;
  }
}
