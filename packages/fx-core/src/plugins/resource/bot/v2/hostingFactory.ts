// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Context } from "@microsoft/teamsfx-api/build/v2";
import { HostTypes, PluginBot } from "../resources/strings";
import { AzureHosting } from "./azureHosting";
import * as utils from "../utils/common";
import { BotHostTypes } from "../../../../common";
import { FunctionHosting } from "./FunctionHosting";
import { BotHosting } from "./BotHosting";

export class HostingResourceFactory {
  static getHostingResources(ctx: Context, pluginId: string): AzureHosting[] {
    const hostingResources = [];
    const rawHostType = ctx.projectSetting?.pluginSettings?.[PluginBot.PLUGIN_NAME]?.[
      PluginBot.HOST_TYPE
    ] as string;

    const hostType = utils.convertToConstValues(rawHostType, HostTypes);

    if (hostType === BotHostTypes.AppService) {
      // hostingResources.push(new WebAppHosting(pluginId));
    } else if (hostType === BotHostTypes.AzureFunctions) {
      hostingResources.push(new FunctionHosting(pluginId));
    }

    hostingResources.push(new BotHosting(pluginId));
    return hostingResources;
  }
}
