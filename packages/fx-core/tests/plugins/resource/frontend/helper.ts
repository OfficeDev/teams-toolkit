// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as faker from "faker";
import { ApplicationTokenCredentials, TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import { AzureAccountProvider, LogLevel, LogProvider, ConfigMap, FolderProvider, PluginContext, TeamsAppManifest } from "fx-api";
import { v4 as uuid } from "uuid";

import { AxiosResponse } from "axios";
import { AzureStorageClient } from "../../../../src/plugins/resource/frontend/clients";
import { DependentPluginInfo } from "../../../../src/plugins/resource/frontend/constants";
import { FrontendConfig } from "../../../../src/plugins/resource/frontend/configs";
import { FrontendPlugin } from "../../../../src/plugins/resource/frontend";
import { Manifest } from "../../../../src/plugins/resource/frontend/ops/scaffold";

export class TestHelper {
    static appName = "app-test";
    static rgName = "app-test-rg";
    static location = "eastus2";
    static rootDir: string = faker.system.directoryPath();
    static storageSuffix: string = uuid().substr(0, 6);
    static functionDefaultEntry = "httpTrigger";
    static functionEndpoint: string = faker.internet.url();
    static runtimeEndpoint: string = faker.internet.url();
    static startLoginPage = "auth-start.html";
    static fakeCredential: TokenCredentialsBase = new ApplicationTokenCredentials(
        faker.random.uuid(),
        faker.internet.url(),
        faker.internet.password(),
    );
    static fakeSubscriptionId: string = faker.random.uuid();

    static fakeAzureAccountProvider: AzureAccountProvider = {
        getAccountCredential: () => {
            return TestHelper.fakeCredential;
        },
        getAccountCredentialAsync: async () => {
            return TestHelper.fakeCredential;
        },
    } as AzureAccountProvider;

    static fakeFolderProvider: FolderProvider = {
        getWorkingPath: () => {
            return faker.system.directoryPath();
        },
    };

    static fakeLogProvider: LogProvider = {
        async log(logLevel: LogLevel, message: string): Promise<boolean> {
            return true;
        },
        async trace(message: string): Promise<boolean> {
            return true;
        },
        async debug(message: string): Promise<boolean> {
            return true;
        },
        async info(message: string): Promise<boolean> {
            return true;
        },
        async warning(message: string): Promise<boolean> {
            return true;
        },
        async error(message: string): Promise<boolean> {
            return true;
        },
        async fatal(message: string): Promise<boolean> {
            return true;
        },
    };

    static getFakePluginContext(): PluginContext {
        const solutionConfig = new Map();
        solutionConfig.set(DependentPluginInfo.SubscriptionId, TestHelper.fakeSubscriptionId);
        solutionConfig.set(DependentPluginInfo.ResourceNameSuffix, TestHelper.storageSuffix);
        solutionConfig.set(DependentPluginInfo.ResourceGroupName, TestHelper.rgName);
        solutionConfig.set(DependentPluginInfo.Location, TestHelper.location);

        const functionConfig = new Map();
        functionConfig.set(DependentPluginInfo.FunctionDefaultName, TestHelper.functionDefaultEntry);
        functionConfig.set(DependentPluginInfo.FunctionEndpoint, TestHelper.functionEndpoint);

        const runtimeConfig = new Map();
        runtimeConfig.set(DependentPluginInfo.RuntimeEndpoint, TestHelper.runtimeEndpoint);
        runtimeConfig.set(DependentPluginInfo.StartLoginPageURL, TestHelper.startLoginPage);

        const pluginContext = {
            azureAccountProvider: TestHelper.fakeAzureAccountProvider,
            FolderProvider: TestHelper.fakeFolderProvider,
            logProvider: TestHelper.fakeLogProvider,
            configOfOtherPlugins: new Map([
                [DependentPluginInfo.SolutionPluginName, solutionConfig],
                [DependentPluginInfo.FunctionPluginName, functionConfig],
                [DependentPluginInfo.RuntimePluginName, runtimeConfig],
            ]),
            config: new Map() as ConfigMap,
            app: {
                name: {
                    short: TestHelper.appName,
                },
            } as TeamsAppManifest,
            root: TestHelper.rootDir,
        } as PluginContext;

        return pluginContext;
    }

    static async getFakeFrontendConfig(ctx: PluginContext): Promise<FrontendConfig> {
        return FrontendConfig.fromPluginContext(ctx);
    }

    static async getFakeAzureStorageClient(ctx?: PluginContext): Promise<AzureStorageClient> {
        ctx ??= TestHelper.getFakePluginContext();
        const config = await TestHelper.getFakeFrontendConfig(ctx);
        return new AzureStorageClient(config);
    }

    static async initializedFrontendPlugin(frontendPlugin: FrontendPlugin, pluginContext: PluginContext) {
        const config = await TestHelper.getFakeFrontendConfig(pluginContext);
        frontendPlugin.frontendPluginImpl.config = config;

        frontendPlugin.frontendPluginImpl.azureStorageClient = await TestHelper.getFakeAzureStorageClient(
            pluginContext,
        );

        return frontendPlugin;
    }

    static latestTemplateURL: string = faker.internet.url();

    static getFakeAxiosResponse(data: any, status = 200): AxiosResponse<any> {
        return {
            status: status,
            data: data,
            statusText: "OK",
            config: {},
            headers: {},
        };
    }

    static getFakeTemplateManifest(): Manifest {
        return {
            a: {
                b: {
                    c: [
                        {
                            version: "0.1.0",
                            url: faker.internet.url(),
                        },
                        {
                            version: "0.2.0",
                            url: faker.internet.url(),
                        },
                        {
                            version: "0.1.3",
                            url: TestHelper.latestTemplateURL,
                        },
                        {
                            version: "0.1.2",
                            url: faker.internet.url(),
                        },
                    ],
                },
            },
        };
    }
}
