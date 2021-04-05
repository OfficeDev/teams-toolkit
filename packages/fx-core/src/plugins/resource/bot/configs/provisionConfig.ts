// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ConfigValue, PluginContext } from "teamsfx-api";
import { ServiceClientCredentials } from "@azure/ms-rest-js";

import * as utils from "../utils/common";
import { PluginSolution, PluginBot } from "../resources/strings";

export class ProvisionConfig {
    public subscriptionId?: string;
    public resourceGroup?: string;
    public location?: string;
    public appServicePlan?: string;
    public botChannelRegName?: string;
    public siteName?: string;
    public siteEndpoint?: string;
    public serviceClientCredentials?: ServiceClientCredentials;
    public graphToken?: string;
    public provisioned = false;

    public async restoreConfigFromContext(context: PluginContext): Promise<void> {

        this.serviceClientCredentials = await context.azureAccountProvider?.getAccountCredentialAsync();

        const subscriptionIdValue: ConfigValue = context.configOfOtherPlugins
            .get(PluginSolution.PLUGIN_NAME)
            ?.get(PluginSolution.SUBSCRIPTION_ID);
        if (subscriptionIdValue) {
            this.subscriptionId = subscriptionIdValue as string;
        }

        const resourceGroupValue: ConfigValue = context.configOfOtherPlugins
            .get(PluginSolution.PLUGIN_NAME)
            ?.get(PluginSolution.RESOURCE_GROUP_NAME);
        if (resourceGroupValue) {
            this.resourceGroup = resourceGroupValue as string;
        }

        const locationValue: ConfigValue = context.configOfOtherPlugins
            .get(PluginSolution.PLUGIN_NAME)
            ?.get(PluginSolution.LOCATION);
        if (locationValue) {
            this.location = locationValue as string;
        }

        const appServicePlanValue: ConfigValue = context.config.get(PluginBot.APP_SERVICE_PLAN);
        if (appServicePlanValue) {
            this.appServicePlan = appServicePlanValue as string;
        }

        const siteNameValue: ConfigValue = context.config.get(PluginBot.SITE_NAME);
        if (siteNameValue) {
            this.siteName = siteNameValue as string;
        }

        const siteEndpointValue: ConfigValue = context.config.get(PluginBot.SITE_ENDPOINT);
        if (siteEndpointValue) {
            this.siteEndpoint = siteEndpointValue as string;
        }

        const provisionedValue: ConfigValue = context.config.get(PluginBot.PROVISIONED);
        if (provisionedValue) {
            this.provisioned = (provisionedValue as string) === "true";
        }

        const botChannelRegNameValue: ConfigValue = context.config.get(PluginBot.BOT_CHANNEL_REGISTRATION);
        if (botChannelRegNameValue) {
            this.botChannelRegName = botChannelRegNameValue as string;
        }
    }

    public saveConfigIntoContext(context: PluginContext): void {
        utils.checkAndSaveConfig(context, PluginBot.APP_SERVICE_PLAN, this.appServicePlan);
        utils.checkAndSaveConfig(context, PluginBot.BOT_CHANNEL_REGISTRATION, this.botChannelRegName);
        utils.checkAndSaveConfig(context, PluginBot.SITE_NAME, this.siteName);
        utils.checkAndSaveConfig(context, PluginBot.SITE_ENDPOINT, this.siteEndpoint);
        utils.checkAndSaveConfig(context, PluginBot.PROVISIONED, this.provisioned ? "true" : "false");
    }
}
