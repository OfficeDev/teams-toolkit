// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ConfigValue, PluginContext } from "@microsoft/teamsfx-api";
import { PluginBot } from "../resources/strings";
import * as utils from "../utils/common";

export class DeployConfig {
    // TODO: (ruhe) remove keytar module if keytar issue is resolved
    public unPackFlag = "true";

    public async restoreConfigFromContext(context: PluginContext): Promise<void> {

        const unPackFlagValue: ConfigValue = context.config.get(PluginBot.UNPACK_FLAG);
        if (unPackFlagValue) {
            this.unPackFlag = unPackFlagValue as string;
        }
    }

    public saveConfigIntoContext(context: PluginContext): void {
        utils.checkAndSaveConfig(context, PluginBot.UNPACK_FLAG, this.unPackFlag);
    }
}