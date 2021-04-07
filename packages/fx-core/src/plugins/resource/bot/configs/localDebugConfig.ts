// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ConfigValue, PluginContext } from "fx-api";
import { PluginLocalDebug } from "../resources/strings";

export class LocalDebugConfig {
    public localEndpoint?: string;

    public async restoreConfigFromContext(context: PluginContext) {
        const localBotEndpoint: ConfigValue | undefined = context.configOfOtherPlugins
            .get(PluginLocalDebug.PLUGIN_NAME)
            ?.get(PluginLocalDebug.LOCAL_BOT_ENDPOINT);
        if (localBotEndpoint) {
            this.localEndpoint = localBotEndpoint as string;
        }
    }
}
