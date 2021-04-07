// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ConfigValue, PluginContext } from "fx-api";
import { PluginBot, PluginLocalDebug, CommonStrings } from "../resources/strings";
import * as utils from "../utils/common";

export class LocalDebugConfig {
    public localEndpoint?: string;
    public localBotId?: string;
    public localBotPassword?: string;
    public localRedirectUri?: string;

    public async restoreConfigFromContext(context: PluginContext): Promise<void> {
        const localBotEndpoint: ConfigValue | undefined = context.configOfOtherPlugins
            .get(PluginLocalDebug.PLUGIN_NAME)
            ?.get(PluginLocalDebug.LOCAL_BOT_ENDPOINT);
        if (localBotEndpoint) {
            this.localEndpoint = localBotEndpoint as string;
            this.localRedirectUri = `${localBotEndpoint}${CommonStrings.AUTH_REDIRECT_URI_SUFFIX}`;
        }

        const localBotIdValue: ConfigValue = context.config.get(PluginBot.LOCAL_BOT_ID);
        if (localBotIdValue) {
            this.localBotId = localBotIdValue as string;
        }

        const localBotPasswordValue: ConfigValue = context.config.get(PluginBot.LOCAL_BOT_PASSWORD);
        if (localBotPasswordValue) {
            this.localBotPassword = localBotPasswordValue as string;
        }

        const localRedirectUriValue: ConfigValue = context.config.get(PluginBot.LOCAL_REDIRECT_URI);
        if (localRedirectUriValue) {
            this.localRedirectUri = localRedirectUriValue as string;
        }
    }

    public saveConfigIntoContext(context: PluginContext): void {
        utils.checkAndSaveConfig(context, PluginBot.LOCAL_BOT_ID, this.localBotId);
        utils.checkAndSaveConfig(context, PluginBot.LOCAL_BOT_PASSWORD, this.localBotPassword);
        utils.checkAndSaveConfig(context, PluginBot.LOCAL_REDIRECT_URI, this.localRedirectUri);
    }
}
