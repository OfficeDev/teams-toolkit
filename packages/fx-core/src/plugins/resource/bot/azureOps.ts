// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureBotService } from "@azure/arm-botservice";
import * as appService from "@azure/arm-appservice";
import {
    ProvisionError, ConfigUpdatingError,
    ListPublishingCredentialsError, ZipDeployError,
    MessageEndpointUpdatingError
} from "./errors";
import { CommonStrings, ConfigNames } from "./resources/strings";
import * as utils from "./utils/common";
import { default as axios } from "axios";

export class AzureOperations {
    public static async CreateBotChannelRegistration(botClient: AzureBotService, resourceGroup: string, botChannelRegistrationName: string, msaAppId: string): Promise<void> {
        let botResponse = undefined;
        try {
            botResponse = await botClient.bots.create(
                resourceGroup,
                botChannelRegistrationName,
                {
                    location: "global",
                    kind: "bot",
                    properties: {
                        displayName: botChannelRegistrationName,
                        endpoint: "",
                        msaAppId: msaAppId,
                    },
                },
            );
        } catch (e) {
            throw new ProvisionError(CommonStrings.BOT_CHANNEL_REGISTRATION, e);
        }

        if (!botResponse || !utils.isHttpCodeOkOrCreated(botResponse._response.status)) {
            throw new ProvisionError(CommonStrings.BOT_CHANNEL_REGISTRATION);
        }
    }

    public static async UpdateBotChannelRegistration(botClient: AzureBotService, resourceGroup: string,
        botChannelRegistrationName: string, msaAppId: string, endpoint: string): Promise<void> {
        let botResponse = undefined;
        try {
            botResponse = await botClient.bots.update(
                resourceGroup,
                botChannelRegistrationName,
                {
                    properties: {
                        displayName: botChannelRegistrationName,
                        endpoint: endpoint,
                        msaAppId: msaAppId,
                    },
                },
            );
        } catch (e) {
            throw new MessageEndpointUpdatingError(endpoint, e);
        }

        if (!botResponse || !utils.isHttpCodeOkOrCreated(botResponse._response.status)) {
            throw new MessageEndpointUpdatingError(endpoint);
        }
    }

    public static async LinkTeamsChannel(botClient: AzureBotService, resourceGroup: string, botChannelRegistrationName: string): Promise<void> {
        let channelResponse = undefined;
        try {
            channelResponse = await botClient.channels.create(
                resourceGroup,
                botChannelRegistrationName,
                "MsTeamsChannel",
                {
                    location: "global",
                    kind: "bot",
                    properties: {
                        channelName: "MsTeamsChannel",
                        properties: {
                            isEnabled: true,
                        },
                    },
                },
            );
        } catch (e) {
            throw new ProvisionError(CommonStrings.MS_TEAMS_CHANNEL, e);
        }

        if (!channelResponse || !utils.isHttpCodeOkOrCreated(channelResponse._response.status)) {
            throw new ProvisionError(CommonStrings.MS_TEAMS_CHANNEL);
        }
    }

    public static async CreateOrUpdateAppServicePlan(webSiteMgmtClient: appService.WebSiteManagementClient,
        resourceGroup: string, appServicePlanName: string,
        location: string): Promise<void> {

        const appServicePlan: appService.WebSiteManagementModels.AppServicePlan = {
            location: location,
            kind: "app",
            sku: {
                name: "F1",
                tier: "Free",
                size: "F1",
            },
        };

        let planResponse = undefined;
        try {
            planResponse = await webSiteMgmtClient.appServicePlans.createOrUpdate(
                resourceGroup,
                appServicePlanName,
                appServicePlan,
            );
        } catch (e) {
            throw new ProvisionError(CommonStrings.APP_SERVICE_PLAN, e);
        }

        if (!planResponse || !utils.isHttpCodeOkOrCreated(planResponse._response.status)) {
            throw new ProvisionError(CommonStrings.APP_SERVICE_PLAN);
        }
    }

    public static async CreateOrUpdateAzureWebApp(webSiteMgmtClient: appService.WebSiteManagementClient,
        resourceGroup: string, siteName: string, siteEnvelope: appService.WebSiteManagementModels.Site, update?: boolean): Promise<any> {
        let webappResponse = undefined;
        try {
            webappResponse = await webSiteMgmtClient.webApps.createOrUpdate(
                resourceGroup,
                siteName,
                siteEnvelope,
            );
        } catch (e) {
            if (!update) {
                throw new ProvisionError(CommonStrings.AZURE_WEB_APP, e);
            } else {
                throw new ConfigUpdatingError(ConfigNames.AZURE_WEB_APP_AUTH_CONFIGS, e);
            }
        }

        if (!webappResponse || !utils.isHttpCodeOkOrCreated(webappResponse._response.status)) {
            if (!update) {
                throw new ProvisionError(CommonStrings.AZURE_WEB_APP);
            } else {
                throw new ConfigUpdatingError(ConfigNames.AZURE_WEB_APP_AUTH_CONFIGS);
            }
        }

        return webappResponse;
    }

    public static async ListPublishingCredentials(webSiteMgmtClient: appService.WebSiteManagementClient,
        resourceGroup: string, siteName: string): Promise<any> {
        let listResponse = undefined;
        try {
            listResponse = await webSiteMgmtClient.webApps.listPublishingCredentials(
                resourceGroup,
                siteName,
            );
        } catch (e) {
            throw new ListPublishingCredentialsError(e);
        }

        if (!listResponse || !utils.isHttpCodeOkOrCreated(listResponse._response.status)) {
            throw new ListPublishingCredentialsError();
        }

        return listResponse;
    }

    public static async ZipDeployPackage(zipDeployEndpoint: string, zipBuffer: Buffer, config: any): Promise<void> {
        let res = undefined;
        try {
            res = await axios.post(zipDeployEndpoint, zipBuffer, config);
        } catch (e) {
            throw new ZipDeployError(e);
        }

        if (!res || !utils.isHttpCodeOkOrCreated(res.status)) {
            throw new ZipDeployError();
        }
    }
}