// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ConfigValue, PluginContext } from "@microsoft/teamsfx-api";
import { LocalSettingsBotKeys } from "../../../../common/localSettingsConstants";
import { PluginBot, PluginLocalDebug, CommonStrings } from "../resources/strings";
import * as utils from "../utils/common";

export class LocalDebugConfig {
  public localEndpoint?: string;
  public localBotId?: string;
  public localBotPassword?: string;
  public localObjectId?: string;
  public localRedirectUri?: string;

  public botAADCreated(): boolean {
    if (this.localBotId && this.localBotPassword) {
      return true;
    }

    return false;
  }

  public async restoreConfigFromContext(context: PluginContext): Promise<void> {
    this.localEndpoint = context.localSettings?.bot?.get(
      LocalSettingsBotKeys.BotEndpoint
    ) as string;
    this.localRedirectUri = this.localEndpoint
      ? `${this.localEndpoint}${CommonStrings.AUTH_REDIRECT_URI_SUFFIX}`
      : undefined;

    this.localBotId = context.localSettings?.bot?.get(LocalSettingsBotKeys.BotId) as string;
    this.localBotPassword = context.localSettings?.bot?.get(
      LocalSettingsBotKeys.BotPassword
    ) as string;
    this.localObjectId = context.localSettings?.bot?.get(
      LocalSettingsBotKeys.BotAadObjectId
    ) as string;
    this.localRedirectUri = context.localSettings?.bot?.get(
      LocalSettingsBotKeys.BotRedirectUri
    ) as string;

    // To respect existing Bot AAD.
    this.localBotId = context.envInfo.config.bot?.appId ?? this.localBotId;
    this.localBotPassword = context.envInfo.config.bot?.appPassword ?? this.localBotPassword;
  }

  public saveConfigIntoContext(context: PluginContext): void {
    context.localSettings?.bot?.set(LocalSettingsBotKeys.BotId, this.localBotId);
    context.localSettings?.bot?.set(LocalSettingsBotKeys.BotPassword, this.localBotPassword);
    context.localSettings?.bot?.set(LocalSettingsBotKeys.BotAadObjectId, this.localObjectId);
    context.localSettings?.bot?.set(LocalSettingsBotKeys.BotRedirectUri, this.localRedirectUri);
  }
}
