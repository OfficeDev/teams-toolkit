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
  LocalSettingsEncryptKeys,
} from "./localSettingsConstants";
import { isMultiEnvEnabled } from "./tools";

export const localSettingsFileName = "localSettings.json";
const crypto = "crypto";

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
    includeBotOrMessageExtension: boolean,
    migrateFromV1 = false
  ): LocalSettings {
    // initialize Teams app related config for local debug.
    const teamsAppLocalConfig = new ConfigMap();
    teamsAppLocalConfig.set(LocalSettingsTeamsAppKeys.TenantId, "");
    teamsAppLocalConfig.set(LocalSettingsTeamsAppKeys.TeamsAppId, "");

    const localSettings: LocalSettings = {
      teamsApp: teamsAppLocalConfig,
    };

    if (!migrateFromV1) {
      localSettings.auth = this.initSimpleAuth();
    }

    // initialize frontend and simple auth local settings.
    if (includeFrontend) {
      localSettings.frontend = this.initFrontend();
    }

    // initialize backend local settings.
    if (includeBackend) {
      localSettings.backend = this.initBackend();
    }

    // initialize bot local settings.
    if (includeBotOrMessageExtension) {
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
    addBot: boolean,
    addFrontend: boolean
  ): LocalSettings {
    if (!localSettings.backend && addBackaned) {
      localSettings.backend = this.initBackend();
    }

    if (!localSettings.bot && addBot) {
      localSettings.bot = this.initBot();
    }

    if (!localSettings.frontend && addFrontend) {
      localSettings.frontend = this.initFrontend();
    }

    return localSettings;
  }

  public async load(cryptoProvider?: CryptoProvider): Promise<LocalSettings | undefined> {
    if (await fs.pathExists(this.localSettingsFilePath)) {
      const localSettingsJson = await fs.readJson(this.localSettingsFilePath);
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
      const localSettingsJson: Json = await fs.readJson(this.localSettingsFilePath);
      if (localSettingsJson && cryptoProvider) {
        const localSettings: LocalSettings = this.convertToLocalSettings(localSettingsJson);
        this.decryptLocalSettings(localSettings, cryptoProvider);
        return this.convertToLocalSettingsJson(localSettings);
      }
      return localSettingsJson;
    } else {
      return undefined;
    }
  }

  private decryptLocalSettings(localSettings: LocalSettings, cryptoProvider: CryptoProvider): void {
    if (localSettings.auth) {
      if (
        localSettings.auth.get(LocalSettingsEncryptKeys.ClientSecret) &&
        localSettings.auth.get(LocalSettingsEncryptKeys.ClientSecret).startsWith(crypto)
      ) {
        const decryptedResult = cryptoProvider.decrypt(
          localSettings.auth.get(LocalSettingsEncryptKeys.ClientSecret)
        );
        if (decryptedResult.isOk()) {
          localSettings.auth.set(LocalSettingsEncryptKeys.ClientSecret, decryptedResult.value);
        }
      }
      if (
        localSettings.auth.get(LocalSettingsEncryptKeys.SimpleAuthEnvironmentVariableParams) &&
        localSettings.auth
          .get(LocalSettingsEncryptKeys.SimpleAuthEnvironmentVariableParams)
          .startsWith(crypto)
      ) {
        const decryptedResult = cryptoProvider.decrypt(
          localSettings.auth.get(LocalSettingsEncryptKeys.SimpleAuthEnvironmentVariableParams)
        );
        if (decryptedResult.isOk()) {
          localSettings.auth.set(
            LocalSettingsEncryptKeys.SimpleAuthEnvironmentVariableParams,
            decryptedResult.value
          );
        }
      }
    }
    if (localSettings.bot) {
      if (
        localSettings.bot.get(LocalSettingsEncryptKeys.BotPassword) &&
        localSettings.bot.get(LocalSettingsEncryptKeys.BotPassword).startsWith(crypto)
      ) {
        const decryptedResult = cryptoProvider.decrypt(
          localSettings.bot.get(LocalSettingsEncryptKeys.BotPassword)
        );
        if (decryptedResult.isOk()) {
          localSettings.bot.set(LocalSettingsEncryptKeys.BotPassword, decryptedResult.value);
        }
      }
    }
  }

  public async save(localSettings: LocalSettings, cryptoProvider?: CryptoProvider): Promise<void> {
    await fs.createFile(this.localSettingsFilePath);
    if (cryptoProvider) {
      if (localSettings.auth) {
        if (localSettings.auth.get(LocalSettingsEncryptKeys.ClientSecret)) {
          const encryptedSecret = cryptoProvider.encrypt(
            localSettings.auth.get(LocalSettingsEncryptKeys.ClientSecret)
          );
          if (encryptedSecret.isOk()) {
            localSettings.auth.set(LocalSettingsEncryptKeys.ClientSecret, encryptedSecret.value);
          }
        }
        if (localSettings.auth.get(LocalSettingsEncryptKeys.SimpleAuthEnvironmentVariableParams)) {
          const encryptedSecret = cryptoProvider.encrypt(
            localSettings.auth.get(LocalSettingsEncryptKeys.SimpleAuthEnvironmentVariableParams)
          );
          if (encryptedSecret.isOk()) {
            localSettings.auth.set(
              LocalSettingsEncryptKeys.SimpleAuthEnvironmentVariableParams,
              encryptedSecret.value
            );
          }
        }
      }
      if (localSettings.bot && localSettings.bot.get(LocalSettingsEncryptKeys.BotPassword)) {
        const encryptedSecret = cryptoProvider.encrypt(
          localSettings.bot.get(LocalSettingsEncryptKeys.BotPassword)
        );
        if (encryptedSecret.isOk()) {
          localSettings.bot.set(LocalSettingsEncryptKeys.BotPassword, encryptedSecret.value);
        }
      }
    }
    await fs.writeFile(this.localSettingsFilePath, JSON.stringify(localSettings, null, 4));
  }

  public async saveJson(localSettingsJson: Json, cryptoProvider?: CryptoProvider): Promise<Json> {
    const localSettings = this.convertToLocalSettings(localSettingsJson);
    await this.save(localSettings);
    return this.convertToLocalSettingsJson(localSettings);
  }

  private convertToLocalSettings(localSettingsJson: Json): LocalSettings {
    const localSettings: LocalSettings = {
      teamsApp: ConfigMap.fromJSON(localSettingsJson.teamsApp)!,
      auth: ConfigMap.fromJSON(localSettingsJson.auth),
      frontend: ConfigMap.fromJSON(localSettingsJson.frontend),
      backend: ConfigMap.fromJSON(localSettingsJson.backend),
      bot: ConfigMap.fromJSON(localSettingsJson.bot),
    };
    return localSettings;
  }

  private convertToLocalSettingsJson(localSettings: LocalSettings): Json {
    const localSettingsJson: Json = {
      teamsApp: localSettings.teamsApp?.toJSON(),
      auth: localSettings.auth?.toJSON(),
    };

    if (localSettings.frontend) {
      localSettingsJson["frontend"] = localSettings.frontend.toJSON();
    }
    if (localSettings.backend) {
      localSettingsJson["backend"] = localSettings.backend.toJSON();
    }
    if (localSettings.bot) {
      localSettingsJson["bot"] = localSettings.bot.toJSON();
    }

    return localSettingsJson;
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
