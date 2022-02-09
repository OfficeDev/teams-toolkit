// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ConfigValue, Inputs, PluginContext, v2, v3 } from "@microsoft/teamsfx-api";
import { BuiltInFeaturePluginNames } from "../../../solution/fx-solution/v3/constants";
import { PluginBot } from "../resources/strings";
import * as utils from "../utils/common";

export class DeployConfig {
  // TODO: (ruhe) remove keytar module if keytar issue is resolved
  public unPackFlag = "true";

  public async restoreConfigFromContext(context: PluginContext): Promise<void> {
    this.unPackFlag = context.config.get(PluginBot.UNPACK_FLAG) as string;
  }

  public saveConfigIntoContext(context: PluginContext): void {
    utils.checkAndSaveConfig(context, PluginBot.UNPACK_FLAG, this.unPackFlag);
  }

  public async restoreConfigFromContextV3(envInfo: v3.EnvInfoV3): Promise<void> {
    const botConfig = envInfo.state[BuiltInFeaturePluginNames.bot];
    if (botConfig) {
      this.unPackFlag = botConfig[PluginBot.UNPACK_FLAG] as string;
    }
  }

  public saveConfigIntoContextV3(envInfo: v3.EnvInfoV3): void {
    let botConfig = envInfo.state[BuiltInFeaturePluginNames.bot];
    if (!botConfig) {
      botConfig = {};
      envInfo.state[BuiltInFeaturePluginNames.bot] = botConfig;
    }
    utils.checkAndSaveConfigV3(botConfig, PluginBot.UNPACK_FLAG, this.unPackFlag);
  }
}
