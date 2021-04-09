// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export class ProjectConstants {
    public static readonly pluginShortName: string = "APIM";
    public static readonly pluginDisplayName: string = "API Management";
    public static readonly configFilePath: string = "env.default.json";
    public static readonly workingDir: string = "openapi";
    public static readonly openApiDocumentFileName: string = "openapi.json";
}

export class ApimDefaultValues {
    public static readonly functionBasePath: string = "/api";
    public static readonly productDescription: string = "Created by TeamsFX.";
    public static readonly oAuthServerDescription: string = "Created by TeamsFX.";
    public static readonly enableScopeName: string = ".default";
    public static readonly userId: string = "sample@microsoft.com";
    public static readonly apiPrefix: string = "title";
    public static readonly apiVersion: string = "v1";
}

export class AadDefaultValues {
    public static readonly graphApiBasePath: string = "https://graph.microsoft.com/v1.0";
    public static readonly redirectUris: string[] = [];
}

export class QuestionConstants {
    public static readonly namespace: string = "fx-solution-azure/fx-resource-apim";

    public static readonly Apim = class {
        public static readonly questionName: string = "apim-service";
        public static readonly funcName: string = "apim-service-option";
        public static readonly description: string = "Select API Management service";
        public static readonly createNewApimOption: string = "+ Create a new API Management service";
    };

    public static readonly OpenApiDocument = class {
        public static readonly questionName: string = "open-api-document";
        public static readonly funcName: string = "open-api-document-option";
        public static readonly description: string = "Select Open API document";
        public static readonly excludeFolders: string[] = ["node_modules"];
        public static readonly openApiDocumentFileExtensions: string[] = ["json", "yaml"];
    };

    public static readonly ExistingOpenApiDocument = class {
        public static readonly questionName: string = QuestionConstants.OpenApiDocument.questionName;
        public static readonly funcName: string = "existing-open-api-document-option";
    };

    public static readonly ApiPrefix = class {
        public static readonly questionName: string = "api-prefix";
        public static readonly funcName: string = "api-prefix-default-value";
        public static readonly description: string = "Input API name prefix";
        public static readonly prompt: string = "Input API name prefix";
    };

    public static readonly ApiVersion = class {
        public static readonly questionName: string = "api-version";
        public static readonly funcName: string = "api-version-option";
        public static readonly description: string = "Select an API version";
        public static readonly createNewApiVersionOption: string = "+ Create a new API version";
    };

    public static readonly NewApiVersion = class {
        public static readonly questionName: string = "new-api-version";
        public static readonly funcName: string = "new-api-version-default-value";
        public static readonly description: string = "Input API version";
        public static readonly prompt: string = "Input API version";
    };
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
    Login
}

export enum TeamsToolkitComponent {
    FunctionPlugin = "fx-resource-function",
    AadPlugin = "fx-resource-aad-app-for-teams",
    Solution = "solution",
    ApimPlugin = "fx-resource-apim",
}

export const LifeCycleCommands: { [key in LifeCycle]: string } = Object.freeze({
    [LifeCycle.Create]: "start a project",
    [LifeCycle.Update]: "add the resource",
    [LifeCycle.Provision]: "provision resource",
    [LifeCycle.Deploy]: "deploy package",
    [LifeCycle.Login]: "login and choose a subscription",
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
        [SolutionConfigKeys.subscriptionId]: LifeCycle.Login,
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
    None = "",
    Scaffold = "Scaffold OpenAPI document",
    Provision = "Create API Management and client AAD app",
    PostProvision = "Configure API Management and AAD apps",
    Deploy = "Import API into API Management",
}

export const ProgressMessages: { [key in ProgressStep]: { [step: string]: string } } = {
    [ProgressStep.None]: {},
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
    [ProgressStep.Deploy]: {
        ImportApi: "Import API into API management",
    },
};
