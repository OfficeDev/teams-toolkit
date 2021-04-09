// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PluginContext } from "fx-api";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";

import { Constants, DependentPluginInfo, FrontendConfigInfo } from "./constants";
import { InvalidStorageNameError, NotScaffoldError, UnauthenticatedError } from "./resources/errors";
import { Utils } from "./utils";

export class FrontendConfig {
    appName: string;
    subscriptionId: string;
    resourceNameSuffix: string;
    resourceGroupName: string;
    location: string;
    storageName: string;
    credentials: TokenCredentialsBase;

    localPath?: string;

    private constructor(
        appName: string,
        subscriptionId: string,
        resourceGroupName: string,
        location: string,
        resourceNameSuffix: string,
        storageName: string,
        credentials: TokenCredentialsBase,
    ) {
        this.appName = appName;
        this.subscriptionId = subscriptionId;
        this.resourceGroupName = resourceGroupName;
        this.location = location;
        this.resourceNameSuffix = resourceNameSuffix;
        this.storageName = storageName;
        this.credentials = credentials;
    }

    static async fromPluginContext(ctx: PluginContext): Promise<FrontendConfig> {
        const credentials = await ctx.azureAccountProvider?.getAccountCredentialAsync();
        if (!credentials) {
            throw new UnauthenticatedError();
        }

        const appName = ctx.app.name.short;
        const solutionConfigs = ctx.configOfOtherPlugins.get(DependentPluginInfo.SolutionPluginName);

        const subscriptionId = solutionConfigs?.get(DependentPluginInfo.SubscriptionId) as string;
        const resourceNameSuffix = solutionConfigs?.get(DependentPluginInfo.ResourceNameSuffix) as string;
        const resourceGroupName = solutionConfigs?.get(DependentPluginInfo.ResourceGroupName) as string;
        const location = solutionConfigs?.get(DependentPluginInfo.Location) as string;
        if (!subscriptionId || !resourceNameSuffix || !resourceGroupName) {
            throw new NotScaffoldError();
        }

        let storageName = ctx.config.getString(FrontendConfigInfo.StorageName);
        if (!storageName) {
            storageName = Utils.generateStorageAccountName(appName, resourceNameSuffix, Constants.FrontendSuffix);
        }
        if (!Constants.FrontendStorageNamePattern.test(storageName)) {
            throw new InvalidStorageNameError();
        }

        return new FrontendConfig(
            appName,
            subscriptionId,
            resourceGroupName,
            location,
            resourceNameSuffix,
            storageName,
            credentials,
        );
    }
}
