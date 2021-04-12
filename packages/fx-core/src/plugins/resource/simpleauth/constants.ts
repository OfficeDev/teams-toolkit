// Copyright (c) Microsoft Corporation.

import path from "path";

// Licensed under the MIT license.
export class Constants {
    static readonly SolutionPlugin = {
        id: "solution",
        configKeys: {
            resourceNameSuffix: "resourceNameSuffix",
            subscriptionId: "subscriptionId",
            resourceGroupName: "resourceGroupName",
            location: "location",
        },
    };

    static readonly AadAppPlugin = {
        id: "fx-resource-aad-app-for-teams",
        configKeys: {
            clientId: "clientId",
            clientSecret: "clientSecret",
            applicationIdUris: "applicationIdUris",
            oauthAuthority: "oauthAuthority",
            teamsMobileDesktopAppId: "teamsMobileDesktopAppId",
            teamsWebAppId: "teamsWebAppId",
        },
    };

    static readonly SimpleAuthPlugin = {
        id: "fx-resource-simple-auth",
        name: "Simple Auth Plugin",
        shortName: "sa",
        configKeys: {
            endpoint: "endpoint",
            filePath: "filePath",
            environmentVariableParams: "environmentVariableParams",
            skuName: "skuName",
        },
    };

    static readonly ResourcesFolderName: string = path.join("templates", "plugins", "resource", "simpleauth");
    static readonly SimpleAuthFileName: string = "SimpleAuth.zip";

    static readonly ResourceNameMaxLength = 40;
    static readonly SimpleAuthSuffix = "sa";
    static readonly LocalPrefix = "local_";

    static readonly Component = "component";

    static readonly ApplicationSettingsKeys = {
        clientId: "CLIENT_ID",
        clientSecret: "CLIENT_SECRET",
        oauthTokenEndpoint: "OAUTH_TOKEN_ENDPOINT",
        applicationIdUris: "IDENTIFIER_URI",
        allowedAppIds: "ALLOWED_APP_IDS",
    };

    static readonly ProgressBar = {
        start: "Starting",
        provision: {
            title: "Creating Simple Auth",
            createAppServicePlan: "Creating App Service Plan",
            createWebApp: "Creating Azure Web App",
            zipDeploy: "Doing Zip Deployment",
        },
        postProvision: {
            title: "Configuring Simple Auth",
            updateWebApp: "Updating Azure Web App",
        },
    };

    static readonly FreeServerFarmsQuotaErrorFromAzure =
        "The maximum number of Free ServerFarms allowed in a Subscription is 10";
    static readonly FreeServerFarmsQuotaErrorToUser =
        "The maximum number of Free App Service Plan allowed in a Subscription is 10. Please delete other Free App Service Plan and try provision again.";
    static readonly FreeServerFarmsQuotaErrorHelpLink = "https://aka.ms/rc-free-tier-limit";
}

export interface Message {
    log: string;
    telemetry: string;
}

export class Messages {
    public static readonly getLog = (log: string) => `[${Constants.SimpleAuthPlugin.name}] ${log}`;
    private static readonly getEventName = (eventName: string) => `${Constants.SimpleAuthPlugin.id}/${eventName}`;

    static readonly StartLocalDebug: Message = {
        log: Messages.getLog("Start to local-debug"),
        telemetry: Messages.getEventName("local-debug-start"),
    };
    static readonly EndLocalDebug: Message = {
        log: Messages.getLog("Successfully local-debug"),
        telemetry: Messages.getEventName("local-debug"),
    };
    static readonly StartPostLocalDebug: Message = {
        log: Messages.getLog("Start to post-local-debug"),
        telemetry: Messages.getEventName("post-local-debug-start"),
    };
    static readonly EndPostLocalDebug: Message = {
        log: Messages.getLog("Successfully post-local-debug"),
        telemetry: Messages.getEventName("post-local-debug"),
    };
    static readonly StartProvision: Message = {
        log: Messages.getLog("Start to provision"),
        telemetry: Messages.getEventName("provision-start"),
    };
    static readonly EndProvision: Message = {
        log: Messages.getLog("Successfully provision"),
        telemetry: Messages.getEventName("provision"),
    };
    static readonly StartPostProvision: Message = {
        log: Messages.getLog("Start to post-provision"),
        telemetry: Messages.getEventName("post-provision-start"),
    };
    static readonly EndPostProvision: Message = {
        log: Messages.getLog("Successfully post-provision"),
        telemetry: Messages.getEventName("post-provision"),
    };
}
