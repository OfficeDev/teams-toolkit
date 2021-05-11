import {
    PluginContext,
} from "@microsoft/teamsfx-api";

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