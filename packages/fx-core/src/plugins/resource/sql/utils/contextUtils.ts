// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PluginContext } from "@microsoft/teamsfx-api";

export class ContextUtils {
  public static getConfig<T>(ctx: PluginContext, plugin: string, key: string): T {
    const pluginConfig = ctx.envInfo.state.get(plugin);
    return pluginConfig!.get(key) as T;
  }
}
