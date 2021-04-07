// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
    PluginContext,
} from "fx-api";

export class ContextUtils {
    static ctx: PluginContext;

    public static init(ctx: PluginContext) {
        ContextUtils.ctx = ctx;
    }

    public static getConfigString(plugin: string, key: string): string {
        const pluginConfig = ContextUtils.ctx.configOfOtherPlugins.get(plugin);
        return pluginConfig!.get(key) as string;
    }
}