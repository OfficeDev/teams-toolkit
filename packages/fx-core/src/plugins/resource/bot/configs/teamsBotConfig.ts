// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ConfigValue, PluginContext, AzureSolutionSettings } from "fx-api";

import { LocalDebugConfig } from "./localDebugConfig";
import { ProvisionConfig } from "./provisionConfig";
import { ScaffoldConfig } from "./scaffoldConfig";
import { PluginSolution, PluginAAD } from "../resources/strings";
import { PluginActRoles } from "../enums/pluginActRoles";
import { QuestionNames } from "../constants";
import { DeployConfig } from "./deployConfig";

export class TeamsBotConfig {
    public scaffold: ScaffoldConfig = new ScaffoldConfig();
    public provision: ProvisionConfig = new ProvisionConfig();
    public localDebug: LocalDebugConfig = new LocalDebugConfig();
    public deploy: DeployConfig = new DeployConfig();

    public teamsAppClientId?: string;
    public teamsAppClientSecret?: string;
    public teamsAppTenant?: string;
    public applicationIdUris?: string;
    public actRoles: PluginActRoles[] = [];
    public resourceNameSuffix?: string;

    public async restoreConfigFromContext(context: PluginContext): Promise<void> {
        await this.scaffold.restoreConfigFromContext(context);
        await this.provision.restoreConfigFromContext(context);
        await this.localDebug.restoreConfigFromContext(context);
        await this.deploy.restoreConfigFromContext(context);

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

        const tenantIdValue: ConfigValue = context.configOfOtherPlugins.get(PluginSolution.PLUGIN_NAME)?.get(PluginSolution.M365_TENANT_ID);
        if (tenantIdValue) {
            this.teamsAppTenant = tenantIdValue as string;
        }

        const applicationIdUrisValue: ConfigValue = context.configOfOtherPlugins.get(PluginAAD.PLUGIN_NAME)?.get(PluginAAD.APPLICATION_ID_URIS);
        if (applicationIdUrisValue) {
            this.applicationIdUris = applicationIdUrisValue as string;
        }

        const capabilities = (context.projectSettings?.solutionSettings as AzureSolutionSettings).capabilities;

        if (capabilities?.includes(PluginActRoles.Bot) && !this.actRoles.includes(PluginActRoles.Bot)) {
            this.actRoles.push(PluginActRoles.Bot);
        }

        if (capabilities?.includes(PluginActRoles.MessageExtension) && !this.actRoles.includes(PluginActRoles.MessageExtension)) {
            this.actRoles.push(PluginActRoles.MessageExtension);
        }

        const resourceNameSuffixValue: ConfigValue = context.configOfOtherPlugins.get(PluginSolution.PLUGIN_NAME)?.get(PluginSolution.RESOURCE_NAME_SUFFIX);
        if (resourceNameSuffixValue) {
            this.resourceNameSuffix = resourceNameSuffixValue as string;
        }
    }

    public saveConfigIntoContext(context: PluginContext): void {
        this.scaffold.saveConfigIntoContext(context);
        this.provision.saveConfigIntoContext(context);
        this.localDebug.saveConfigIntoContext(context);
        this.deploy.saveConfigIntoContext(context);
    }

    public toString(): string {
        return JSON.stringify(this);
    }
}
