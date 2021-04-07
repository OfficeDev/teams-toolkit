// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export class ProjectConstants {
    public static readonly pluginShortName: string = "APIM";
    public static readonly configFilePath: string = "env.default.json";
    public static readonly workingDir: string = "openapi";
    public static readonly openApiDocumentFileName: string = "openapi.json";
}

export class ApimDefaultValues {
    public static readonly functionBasePath: string = "/api";
    public static readonly productDescription: string = "Created by TeamsFX.";
    public static readonly oAuthServerDescription: string = "Created by TeamsFX.";
    public static readonly enableScopeName: string = ".default";
    public static readonly userId = "sample@microsoft.com";
}

export class AadDefaultValues {
    public static readonly graphApiBasePath = "https://graph.microsoft.com/v1.0";
    public static readonly redirectUris: string[] = [];
}

export class QuestionConstants {
    public static readonly askApimServiceDescription: string = "Select API Management service";
    public static readonly askOpenApiDocumentDescription: string = "Select Open API document";
    public static readonly askApiNameDescription: string = "Input API name prefix";
    public static readonly askApiVersionDescription: string = "Select an API version";
    public static readonly askNewApiVersionDescription: string = "Input API version";
    public static readonly askApiNamePrompt: string = "Input API name prefix";
    public static readonly askNewApiVersionPrompt: string = "Input API version";
    public static readonly createNewApimOption: string = "+ Create a new API Management service";
    public static readonly createNewApiVersionOption: string = "+ Create a new API version";
    public static readonly excludeFolders: string[] = ["node_modules"];
    public static readonly openApiDocumentFileExtensions: string[] = ["json", "yaml"];
}

export class ApimPluginConfigKeys {
    public static readonly resourceGroupName: string = "resourceGroupName";
    public static readonly serviceName: string = "serviceName";
    public static readonly productId: string = "productId";
    public static readonly oAuthServerId: string = "oAuthServerId";
    public static readonly apimClientAADObjectId: string = "apimClientAADObjectId";
    public static readonly apimClientAADClientId: string = "apimClientAADClientId";
    public static readonly apimClientAADClientSecret: string = "apimClientAADClientSecret";
    public static readonly apiPrefix: string = "apiPrefix";
    public static readonly versionSetId: string = "versionSetId";
    public static readonly apiPath: string = "apiPath";
    public static readonly apiDocumentPath: string = "apiDocumentPath";
}

export class FunctionPluginConfigKeys {
    public static readonly functionEndpoint: string = "functionEndpoint";
}

export class AadPluginConfigKeys {
    public static readonly objectId: string = "objectId";
    public static readonly clientId: string = "clientId";
    public static readonly oauth2PermissionScopeId: string = "oauth2PermissionScopeId";
    public static readonly applicationIdUris: string = "applicationIdUris";
}

export class SolutionConfigKeys {
    public static readonly subscriptionId: string = "subscriptionId";
    public static readonly resourceNameSuffix: string = "resourceNameSuffix";
    public static readonly tenantId: string = "tenantId";
    public static readonly resourceGroupName: string = "resourceGroupName";
    public static readonly location: string = "location";
}

export enum LifeCycle {
    Create,
    Update,
    Provision,
    Deploy,
}

export enum TeamsToolkitComponent {
    FunctionPlugin = "fx-resource-function",
    AadPlugin = "fx-resource-aad-app-for-teams",
    Solution = "fx-solution-azure",
    ApimPlugin = "fx-resource-apim",
}

export const LifeCycleCommands: { [key in LifeCycle]: string } = Object.freeze({
    [LifeCycle.Create]: "start a project",
    [LifeCycle.Update]: "add the resource",
    [LifeCycle.Provision]: "provision resource",
    [LifeCycle.Deploy]: "deploy package",
});

export const ComponentRetryLifeCycle: { [key in TeamsToolkitComponent]: LifeCycle } = Object.freeze({
    [TeamsToolkitComponent.FunctionPlugin]: LifeCycle.Update,
    [TeamsToolkitComponent.AadPlugin]: LifeCycle.Create,
    [TeamsToolkitComponent.Solution]: LifeCycle.Create,
    [TeamsToolkitComponent.ApimPlugin]: LifeCycle.Update,
});

export const ConfigRetryLifeCycle: { [key in TeamsToolkitComponent]: { [key: string]: LifeCycle } } = {
    [TeamsToolkitComponent.FunctionPlugin]: {
        [FunctionPluginConfigKeys.functionEndpoint]: LifeCycle.Provision,
    },
    [TeamsToolkitComponent.AadPlugin]: {
        [AadPluginConfigKeys.objectId]: LifeCycle.Provision,
        [AadPluginConfigKeys.clientId]: LifeCycle.Provision,
        [AadPluginConfigKeys.oauth2PermissionScopeId]: LifeCycle.Provision,
        [AadPluginConfigKeys.applicationIdUris]: LifeCycle.Provision,
    },
    [TeamsToolkitComponent.Solution]: {
        [SolutionConfigKeys.resourceNameSuffix]: LifeCycle.Create,
        [SolutionConfigKeys.subscriptionId]: LifeCycle.Provision,
        [SolutionConfigKeys.tenantId]: LifeCycle.Provision,
        [SolutionConfigKeys.resourceGroupName]: LifeCycle.Provision,
        [SolutionConfigKeys.location]: LifeCycle.Provision,
    },
    [TeamsToolkitComponent.ApimPlugin]: {
        [ApimPluginConfigKeys.resourceGroupName]: LifeCycle.Provision,
        [ApimPluginConfigKeys.serviceName]: LifeCycle.Provision,
        [ApimPluginConfigKeys.productId]: LifeCycle.Provision,
        [ApimPluginConfigKeys.oAuthServerId]: LifeCycle.Provision,
        [ApimPluginConfigKeys.apimClientAADObjectId]: LifeCycle.Provision,
        [ApimPluginConfigKeys.apimClientAADClientId]: LifeCycle.Provision,
        [ApimPluginConfigKeys.apimClientAADClientSecret]: LifeCycle.Provision,
        [ApimPluginConfigKeys.apiPrefix]: LifeCycle.Deploy,
        [ApimPluginConfigKeys.versionSetId]: LifeCycle.Deploy,
        [ApimPluginConfigKeys.apiPath]: LifeCycle.Deploy,
        [ApimPluginConfigKeys.apiDocumentPath]: LifeCycle.Deploy,
    },
};

export enum ProgressStep {
    PreScaffold = "Ask questions about API Management",
    Scaffold = "Scaffold OpenAPI document",
    Provision = "Create API Management and client AAD app",
    PostProvision = "Configure API Management and AAD apps",
    PreDeploy = "Ask questions about API",
    Deploy = "Import API into API Management",
}

export const ProgressMessages: { [key in ProgressStep]: { [step: string]: string } } = {
    [ProgressStep.PreScaffold]: {},
    [ProgressStep.Scaffold]: {
        Scaffold: "Scaffold OpenAPI document",
    },
    [ProgressStep.Provision]: {
        CreateApim: "Create API Management service",
        CreateAad: "Create client AAD app registration",
    },
    [ProgressStep.PostProvision]: {
        ConfigApim: "Configure API Management service",
        ConfigClientAad: "Configure client AAD app registration",
        ConfigAppAad: `Update AAD app for Teams app`,
    },
    [ProgressStep.PreDeploy]: {},
    [ProgressStep.Deploy]: {
        ImportApi: "Import API into API management",
    },
};
