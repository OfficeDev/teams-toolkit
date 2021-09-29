// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as fs from "fs-extra";
import {
  ConfigFolderName,
  ConfigMap,
  CryptoProvider,
  InputConfigsFolderName,
  Json,
  LocalSettings,
} from "@microsoft/teamsfx-api";
import {
  LocalSettingsAuthKeys,
  LocalSettingsBackendKeys,
  LocalSettingsBotKeys,
  LocalSettingsFrontendKeys,
  LocalSettingsTeamsAppKeys,
} from "./localSettingsConstants";
import { isMultiEnvEnabled } from "./tools";

export const localSettingsFileName = "localSettings.json";

const crypto = "crypto";
const clientSecret = "clientSecret";
const SimpleAuthEnvironmentVariableParams = "SimpleAuthEnvironmentVariableParams";
const botPassword = "botPassword";

export class LocalSettingsProvider {
  public readonly localSettingsFilePath: string;
  constructor(workspaceFolder: string) {
    this.localSettingsFilePath = isMultiEnvEnabled()
      ? `${workspaceFolder}/.${ConfigFolderName}/${InputConfigsFolderName}/${localSettingsFileName}`
      : `${workspaceFolder}/.${ConfigFolderName}/${localSettingsFileName}`;
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

    localSettings.auth = this.initSimpleAuth();

    // initialize frontend and simple auth local settings.
    if (includeFrontend) {
      localSettings.frontend = this.initFrontend();
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

  public initV2(includeFrontend: boolean, includeBackend: boolean, includeBot: boolean): Json {
    const localSettings: Json = {
      teamsApp: {
        [LocalSettingsTeamsAppKeys.TenantId]: "",
        [LocalSettingsTeamsAppKeys.TeamsAppId]: "",
      },
    };

    // initialize frontend and simple auth local settings.
    if (includeFrontend) {
      localSettings.frontend = this.initFrontend().toJSON();
      localSettings.auth = this.initSimpleAuth().toJSON();
    }

    // initialize backend local settings.
    if (includeBackend) {
      localSettings.backend = this.initBackend().toJSON();
    }

    // initialize bot local settings.
    if (includeBot) {
      localSettings.bot = this.initBot().toJSON();
    }

    return localSettings;
  }

  public incrementalInit(
    localSettings: LocalSettings,
    addBackaned: boolean,
    addBot: boolean
  ): LocalSettings {
    if (!localSettings.backend && addBackaned) {
      localSettings.backend = this.initBackend();
    }

    if (!localSettings.bot && addBot) {
      localSettings.bot = this.initBot();
    }

    return localSettings;
  }

  public async load(cryptoProvider?: CryptoProvider): Promise<LocalSettings | undefined> {
    if (await fs.pathExists(this.localSettingsFilePath)) {
      const localSettingsJson = await fs.readJSON(this.localSettingsFilePath);
      const localSettings: LocalSettings = {
        teamsApp: ConfigMap.fromJSON(localSettingsJson.teamsApp)!,
        auth: ConfigMap.fromJSON(localSettingsJson.auth),
        frontend: ConfigMap.fromJSON(localSettingsJson.frontend),
        backend: ConfigMap.fromJSON(localSettingsJson.backend),
        bot: ConfigMap.fromJSON(localSettingsJson.bot),
      };

      if (localSettings && cryptoProvider) {
        this.decryptLocalSettings(localSettings, cryptoProvider);
      }
      return localSettings;
    } else {
      return undefined;
    }
  }

  public async loadV2(cryptoProvider?: CryptoProvider): Promise<Json | undefined> {
    if (await fs.pathExists(this.localSettingsFilePath)) {
      const localSettingsJson: Json = await fs.readJSON(this.localSettingsFilePath);
      if (localSettingsJson && cryptoProvider) {
        this.decryptLocalSettings(localSettingsJson, cryptoProvider);
      }
      return localSettingsJson;
    } else {
      return undefined;
    }
  }

  public decryptLocalSettings(
    localSettings: LocalSettings | Json,
    cryptoProvider: CryptoProvider
  ): void {
    if (localSettings.auth) {
      if (
        localSettings.auth.get(clientSecret) &&
        localSettings.auth.get(clientSecret).startsWith(crypto)
      ) {
        const decryptedResult = cryptoProvider.decrypt(localSettings.auth.get(clientSecret));
        if (decryptedResult.isOk()) {
          localSettings.auth.set(clientSecret, decryptedResult.value);
        }
      }
      if (
        localSettings.auth.get(SimpleAuthEnvironmentVariableParams) &&
        localSettings.auth.get(SimpleAuthEnvironmentVariableParams).startsWith(crypto)
      ) {
        const decryptedResult = cryptoProvider.decrypt(
          localSettings.auth.get(SimpleAuthEnvironmentVariableParams)
        );
        if (decryptedResult.isOk()) {
          localSettings.auth.set(SimpleAuthEnvironmentVariableParams, decryptedResult.value);
        }
      }
    }
    if (localSettings.bot) {
      if (
        localSettings.bot.get(botPassword) &&
        localSettings.bot.get(botPassword).startsWith(crypto)
      ) {
        const decryptedResult = cryptoProvider.decrypt(localSettings.bot.get(botPassword));
        if (decryptedResult.isOk()) {
          localSettings.bot.set(botPassword, decryptedResult.value);
        }
      }
    }
  }

  public async save(
    localSettings: LocalSettings | Json,
    cryptoProvider?: CryptoProvider
  ): Promise<void> {
    await fs.createFile(this.localSettingsFilePath);
    if (cryptoProvider) {
      if (localSettings.auth) {
        if (localSettings.auth.get(clientSecret)) {
          const encryptedSecret = cryptoProvider.encrypt(localSettings.auth.get(clientSecret));
          if (encryptedSecret.isOk()) {
            localSettings.auth.set(clientSecret, encryptedSecret.value);
          }
        }
        if (localSettings.auth.get(SimpleAuthEnvironmentVariableParams)) {
          const encryptedSecret = cryptoProvider.encrypt(
            localSettings.auth.get(SimpleAuthEnvironmentVariableParams)
          );
          if (encryptedSecret.isOk()) {
            localSettings.auth.set(SimpleAuthEnvironmentVariableParams, encryptedSecret.value);
          }
        }
      }
      if (localSettings.bot && localSettings.bot.get(botPassword)) {
        const encryptedSecret = cryptoProvider.encrypt(localSettings.bot.get(botPassword));
        if (encryptedSecret.isOk()) {
          localSettings.bot.set(botPassword, encryptedSecret.value);
        }
      }
    }
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
