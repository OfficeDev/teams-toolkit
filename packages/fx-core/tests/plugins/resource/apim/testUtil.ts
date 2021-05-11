// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import { ResourceManagementClient } from "@azure/arm-resources";
import {
    AzureAccountProvider,
    GraphTokenProvider,
    PluginContext,
    ConfigMap,
    TeamsAppManifest,
    OptionItem,
    Platform,
    SubscriptionInfo,
} from "@microsoft/teamsfx-api";
import { AadOperationError, BuildError, NotImplemented } from "../../../../src/plugins/resource/apim/error";
import { TokenCredential } from "@azure/core-auth";
import { AsyncFunc, Func } from "mocha";
import * as msRestNodeAuth from "@azure/ms-rest-nodeauth";
import { ConfidentialClientApplication } from "@azure/msal-node";
import { AssertNotEmpty } from "../../../../src/plugins/resource/apim/error";
import {
    IAadPluginConfig,
    IApimPluginConfig,
    IFunctionPluginConfig,
    ISolutionConfig,
} from "../../../../src/plugins/resource/apim/model/config";
import { TeamsToolkitComponent } from "../../../../src/plugins/resource/apim/constants";
import { AxiosInstance, Method } from "axios";
import { IAadInfo } from "../../../../src/plugins/resource/apim/model/aadResponse";
import { ApiManagementClient } from "@azure/arm-apimanagement";
import dotenv from "dotenv";

dotenv.config();

export function it_if(condition: boolean, name: string, callback: Func | AsyncFunc): void {
    const fn = condition ? it : it.skip;
    fn(name, callback);
}

export function before_if(condition: boolean, callback: Func | AsyncFunc): void {
    if (condition) {
        before(callback);
    }
}

export function after_if(condition: boolean, callback: Func | AsyncFunc): void {
    if (condition) {
        after(callback);
    }
}

export function beforeEach_if(condition: boolean, callback: Func | AsyncFunc): void {
    if (condition) {
        beforeEach(callback);
    }
}

export class MockAzureAccountProvider implements AzureAccountProvider {
    private credentials: TokenCredentialsBase | undefined;

    async login(clientId: string, secret: string, tenantId: string): Promise<void> {
        this.credentials = await msRestNodeAuth.loginWithServicePrincipalSecretWithAuthResponse(clientId, secret, tenantId).then((authres) => {
            return authres.credentials;
        });
    }

    async getAccountCredentialAsync(): Promise<TokenCredentialsBase | undefined> {
        return this.credentials;
    }

    setStatusChangeMap(name: string, statusChange: (status: string, token?: string, accountInfo?: Record<string, unknown>) => Promise<void>): Promise<boolean> {
        throw BuildError(NotImplemented);
    }
    removeStatusChangeMap(name: string): Promise<boolean> {
        throw BuildError(NotImplemented);
    }
    setStatusChangeCallback(
        statusChange: (status: string, token?: string, accountInfo?: Record<string, unknown>) => Promise<void>
    ): Promise<boolean> {
        throw BuildError(NotImplemented);
    }

    signout(): Promise<boolean> {
        throw BuildError(NotImplemented);
    }

    getIdentityCredentialAsync(): Promise<TokenCredential | undefined> {
        throw BuildError(NotImplemented);
    }

    getAccountCredential(): TokenCredentialsBase | undefined {
        throw BuildError(NotImplemented);
    }

    getIdentityCredential(): TokenCredential | undefined {
        throw BuildError(NotImplemented);
    }

    getJsonObject(showDialog?: boolean): Promise<Record<string, unknown>> {
        throw BuildError(NotImplemented);
    }

    listSubscriptions(): Promise<SubscriptionInfo[]> {
        throw BuildError(NotImplemented);
    }

    setSubscription(subscriptionId: string): Promise<void> {
        throw BuildError(NotImplemented);
    }
}

export class MockGraphTokenProvider implements GraphTokenProvider {
    private readonly clientId: string;
    private readonly tenantId: string;
    private readonly clientSecret: string;

    constructor(tenantId: string, clientId: string, clientSecret: string) {
        this.tenantId = tenantId;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    async getAccessToken(): Promise<string> {
        const config = {
            auth: {
                clientId: this.clientId,
                authority: `https://login.microsoftonline.com/${this.tenantId}`,
                clientSecret: this.clientSecret,
            },
        };

        const clientCredentialRequest = {
            scopes: ["https://graph.microsoft.com/.default"], // replace with your resource
        };

        const cca = new ConfidentialClientApplication(config);
        const credential = await cca.acquireTokenByClientCredential(clientCredentialRequest);
        return AssertNotEmpty("accessToken", credential?.accessToken);
    }

    setStatusChangeMap(name: string, statusChange: (status: string, token?: string, accountInfo?: Record<string, unknown>) => Promise<void>): Promise<boolean> {
        throw BuildError(NotImplemented);
    }
    removeStatusChangeMap(name: string): Promise<boolean> {
        throw BuildError(NotImplemented);
    }
    getJsonObject(showDialog?: boolean): Promise<Record<string, unknown>> {
        throw BuildError(NotImplemented);
    }
    setStatusChangeCallback(
        statusChange: (status: string, token?: string, accountInfo?: Record<string, unknown>) => Promise<void>
    ): Promise<boolean> {
        throw BuildError(NotImplemented);
    }
    signout(): Promise<boolean> {
        throw BuildError(NotImplemented);
    }
}

export class MockPluginContext implements PluginContext {
    configOfOtherPlugins: Map<string, Map<string, string>>;
    config: ConfigMap = new ConfigMap();
    app: Readonly<TeamsAppManifest> = new TeamsAppManifest();
    root = "./~$test/scaffold";
    azureAccountProvider: MockAzureAccountProvider;
    graphTokenProvider: MockGraphTokenProvider;
    answers: ConfigMap | undefined;
    platform: Platform = Platform.VSCode;

    constructor(
        appName: string,
        solutionConfig: ISolutionConfig,
        aadConfig?: IAadPluginConfig,
        functionConfig?: IFunctionPluginConfig,
        apimConfig?: IApimPluginConfig,
        answers?: { [key: string]: OptionItem | string }
    ) {
        this.graphTokenProvider = new MockGraphTokenProvider(EnvConfig.tenantId, EnvConfig.servicePrincipalClientId, EnvConfig.servicePrincipalClientSecret);
        this.azureAccountProvider = new MockAzureAccountProvider();
        this.configOfOtherPlugins = new Map<string, Map<string, string>>();
        this.configOfOtherPlugins.set(TeamsToolkitComponent.Solution, new Map(Object.entries(solutionConfig)));
        this.app.name.short = appName;

        if (aadConfig) {
            this.configOfOtherPlugins.set(TeamsToolkitComponent.AadPlugin, new Map(Object.entries(aadConfig)));
        }

        if (functionConfig) {
            this.configOfOtherPlugins.set(TeamsToolkitComponent.FunctionPlugin, new Map(Object.entries(functionConfig)));
        }

        if (apimConfig) {
            this.config = new ConfigMap(Object.entries(apimConfig));
        }

        if (answers) {
            this.answers = new ConfigMap(Object.entries(answers));
        }
    }

    async init(): Promise<void> {
        await this.azureAccountProvider.login(EnvConfig.servicePrincipalClientId, EnvConfig.servicePrincipalClientSecret, EnvConfig.tenantId);
    }
}

export class AadHelper {
    private readonly axios: AxiosInstance;

    constructor(axios: AxiosInstance) {
        this.axios = axios;
    }

    public async getAads(): Promise<IAadInfo[] | undefined> {
        const response = await this.execute("get", `/applications`, undefined);
        return response?.data?.value as IAadInfo[];
    }

    public async deleteAad(objectId: string): Promise<void> {
        await this.execute("delete", `/applications/${objectId}`, undefined);
    }

    public async deleteAadByName(displayName: string): Promise<void> {
        const aadList = await this.getAads();
        if (!aadList) {
            return;
        }
        for (const aad of aadList) {
            if (aad.displayName === displayName && aad.id) {
                await this.deleteAad(aad.id);
            }
        }
    }

    private async execute(method: Method, url: string, data?: any) {
        try {
            const result = await this.axios.request({
                method: method,
                url: url,
                data: data,
            });

            return result;
        } catch (error) {
            throw BuildError(AadOperationError, error);
        }
    }
}

export class ApimHelper {
    private readonly client: ApiManagementClient;
    constructor(client: ApiManagementClient) {
        this.client = client;
    }

    public async deleteApim(resourceGroupName: string, serviceName: string): Promise<void> {
        try {
            await this.client.apiManagementService.beginDeleteMethod(resourceGroupName, serviceName);
        }
        catch (e) {
            // Ignore the error during cleaning resource
        }
    }
}

export class ResourceGroupHelper {
    private readonly client: ResourceManagementClient;
    constructor(credential: TokenCredentialsBase, subscriptionId: string) {
        this.client = new ResourceManagementClient(credential, subscriptionId);
    }

    public async createResourceGroup(resourceGroupName: string, location: string): Promise<void> {
        await this.client.resourceGroups.createOrUpdate(resourceGroupName, {
            location: location,
        });
    }

    public async deleteResourceGroup(resourceGroupName: string): Promise<void> {
        const existence = await this.client.resourceGroups.checkExistence(resourceGroupName);
        if (existence) {
            await this.client.resourceGroups.deleteMethod(resourceGroupName);
        }
    }
}

export class EnvConfig {
    static enableTest: boolean = process.env.UT_TEST ? process.env.UT_TEST === "true" : false;
    static subscriptionId: string = process.env.UT_SUBSCRIPTION_ID ?? "";
    static servicePrincipalClientId: string = process.env.UT_SERVICE_PRINCIPAL_CLIENT_ID ?? "";
    static servicePrincipalClientSecret: string = process.env.UT_SERVICE_PRINCIPAL_CLIENT_SECRET ?? "";
    static tenantId: string = process.env.UT_TENANT_ID ?? "";
    static defaultLocation: string = process.env.UT_DEFAULT_LOCATION ?? "eastus";
    static defaultGuid = "00000000-0000-4000-0000-000000000000";
}