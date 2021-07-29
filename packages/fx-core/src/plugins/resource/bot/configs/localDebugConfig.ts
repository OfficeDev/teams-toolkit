// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ConfigValue, PluginContext } from "@microsoft/teamsfx-api";
import { PluginBot, PluginLocalDebug, CommonStrings } from "../resources/strings";
import * as utils from "../utils/common";

export class LocalDebugConfig {
  public localEndpoint?: string;
  public localBotId?: string;
  public localBotPassword?: string;
  public localObjectId?: string;
  public localRedirectUri?: string;

  public botRegistrationCreated(): boolean {
    if (this.localBotId && this.localBotPassword && this.localObjectId) {
      return true;
    }

    return false;
  }

  public async restoreConfigFromContext(context: PluginContext): Promise<void> {
    const localBotEndpoint: ConfigValue | undefined = context.configOfOtherPlugins
      .get(PluginLocalDebug.PLUGIN_NAME)
      ?.get(PluginLocalDebug.LOCAL_BOT_ENDPOINT);
    this.localEndpoint = localBotEndpoint as string;
    this.localRedirectUri = localBotEndpoint ? `${localBotEndpoint}${CommonStrings.AUTH_REDIRECT_URI_SUFFIX}` : undefined;

    this.localBotId = context.config.get(PluginBot.LOCAL_BOT_ID) as string;

    this.localBotPassword = context.config.get(PluginBot.LOCAL_BOT_PASSWORD) as string;

    this.localObjectId = context.config.get(PluginBot.LOCAL_OBJECT_ID) as string;

    this.localRedirectUri = context.config.get(PluginBot.LOCAL_REDIRECT_URI) as string;

  }

  public saveConfigIntoContext(context: PluginContext): void {
    utils.checkAndSaveConfig(context, PluginBot.LOCAL_BOT_ID, this.localBotId);
    utils.checkAndSaveConfig(context, PluginBot.LOCAL_BOT_PASSWORD, this.localBotPassword);
    utils.checkAndSaveConfig(context, PluginBot.LOCAL_OBJECT_ID, this.localObjectId);
    utils.checkAndSaveConfig(context, PluginBot.LOCAL_REDIRECT_URI, this.localRedirectUri);
  }
}
