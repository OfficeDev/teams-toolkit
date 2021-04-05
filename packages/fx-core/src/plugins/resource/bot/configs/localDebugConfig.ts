// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ConfigValue, PluginContext } from "teamsfx-api";
import { PluginBot, PluginLocalDebug } from "../resources/strings";
import * as utils from "../utils/common";

export class LocalDebugConfig {
    public localEndpoint?: string;
    public localBotId?: string;
    public localBotPassword?: string;

    public async restoreConfigFromContext(context: PluginContext): Promise<void> {
        const localBotEndpoint: ConfigValue | undefined = context.configOfOtherPlugins
            .get(PluginLocalDebug.PLUGIN_NAME)
            ?.get(PluginLocalDebug.LOCAL_BOT_ENDPOINT);
        if (localBotEndpoint) {
            this.localEndpoint = localBotEndpoint as string;
        }

        const localBotIdValue: ConfigValue = context.config.get(PluginBot.LOCAL_BOT_ID);
        if (localBotIdValue) {
            this.localBotId = localBotIdValue as string;
        }

        const localBotPasswordValue: ConfigValue = context.config.get(PluginBot.LOCAL_BOT_PASSWORD);
        if (localBotPasswordValue) {
            this.localBotPassword = localBotPasswordValue as string;
        }
    }

    public saveConfigIntoContext(context: PluginContext): void {
        utils.checkAndSaveConfig(context, PluginBot.LOCAL_BOT_ID, this.localBotId);
        utils.checkAndSaveConfig(context, PluginBot.LOCAL_BOT_ID, this.localBotPassword);
    }
}
