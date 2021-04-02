// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ConfigValue, PluginContext } from "teamsfx-api";

import { LocalDebugConfig } from "./localDebugConfig";
import { ProvisionConfig } from "./provisionConfig";
import { ScaffoldConfig } from "./scaffoldConfig";
import { PluginSolution, PluginAAD } from "../resources/strings";
import { PluginActRoles } from "../enums/pluginActRoles";
import { QuestionNames } from "../constants";

export class TeamsBotConfig {
    public scaffold: ScaffoldConfig = new ScaffoldConfig();
    public provision: ProvisionConfig = new ProvisionConfig();
    public localDebug: LocalDebugConfig = new LocalDebugConfig();

    public teamsAppClientId?: string;
    public teamsAppClientSecret?: string;
    public teamsAppTenant?: string;
    public actRoles: PluginActRoles[] = [];

    public async restoreConfigFromContext(context: PluginContext): Promise<void> {
        await this.scaffold.restoreConfigFromContext(context);
        await this.provision.restoreConfigFromContext(context);
        await this.localDebug.restoreConfigFromContext(context);

        const clientIdValue: ConfigValue = context.configOfOtherPlugins
            .get(PluginAAD.PLUGIN_NAME)
            ?.get(PluginAAD.CLIENT_ID);
        if (clientIdValue) {
            this.teamsAppClientId = clientIdValue as string;
        }

        const clientSecretValue: ConfigValue = context.configOfOtherPlugins
            .get(PluginAAD.PLUGIN_NAME)
            ?.get(PluginAAD.CLIENT_SECRET);
        if (clientSecretValue) {
            this.teamsAppClientSecret = clientSecretValue as string;
        }

        const tenantIdValue: ConfigValue = context.configOfOtherPlugins.get(PluginSolution.PLUGIN_NAME)?.get(PluginSolution.TENANT_ID);
        if (tenantIdValue) {
            this.teamsAppTenant = tenantIdValue as string;
        }

        const capabilities = context.answers?.getStringArray(QuestionNames.CAPABILITIES);

        if (capabilities?.includes(PluginActRoles.Bot) && !this.actRoles.includes(PluginActRoles.Bot)) {
            this.actRoles.push(PluginActRoles.Bot);
        }

        if (capabilities?.includes(PluginActRoles.MessageExtension) && !this.actRoles.includes(PluginActRoles.MessageExtension)) {
            this.actRoles.push(PluginActRoles.MessageExtension);
        }
    }

    public saveConfigIntoContext(context: PluginContext): void {
        this.scaffold.saveConfigIntoContext(context);
        this.provision.saveConfigIntoContext(context);
    }

    public toString(): string {
        return JSON.stringify(this);
    }
}
