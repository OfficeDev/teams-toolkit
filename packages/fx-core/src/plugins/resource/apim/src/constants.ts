// Copyright (c) Microsoft Corporation.

import path from "path";

// Licensed under the MIT license.
export class ProjectConstants {
    public static readonly pluginShortName: string = "APIM";
    public static readonly pluginDisplayName: string = "API Management";
    public static readonly configFilePath: string = "env.default.json";
    public static readonly workingDir: string = "openapi";
    public static readonly openApiDocumentFileName: string = "openapi.json";
    public static readonly readMeFileName: string = "README.md";
    public static readonly maxRetries: number = 3;
    public static readonly resourceDir: string = path.join(__dirname, "..", "..", "..", "..", "..", "templates", "plugins", "resource", "apim");
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
    public static readonly VSCode = class {
        public static readonly Apim = class {
            public static readonly questionName: string = "vsc-apim-service";
            public static readonly funcName: string = "apim-service-option";
            public static readonly description: string = "Select API Management service";
            public static readonly createNewApimOption: string = "+ Create a new API Management service";
        };

        public static readonly OpenApiDocument = class {
            public static readonly questionName: string = "vsc-open-api-document";
            public static readonly funcName: string = "open-api-document-option";
            public static readonly description: string = "Select Open API document";
            public static readonly excludeFolders: string[] = ["node_modules"];
            public static readonly openApiDocumentFileExtensions: string[] = ["json", "yaml"];
        };

        public static readonly ExistingOpenApiDocument = class {
            // Same to OpenApiDocument.questionName
            public static readonly questionName: string = "vsc-open-api-document";
            public static readonly funcName: string = "existing-open-api-document-option";
        };

        public static readonly ApiPrefix = class {
            public static readonly questionName: string = "vsc-api-prefix";
            public static readonly funcName: string = "api-prefix-default-value";
            public static readonly description: string = "Input the API name prefix.";
            public static readonly prompt: string = "The unique name of the API will be '{api-prefix}-{resource-suffix}-{api-version}'.";
        };

        public static readonly ApiVersion = class {
            public static readonly questionName: string = "vsc-api-version";
            public static readonly funcName: string = "api-version-option";
            public static readonly description: string = "Select an API version.";
            public static readonly createNewApiVersionOption: string = "+ Create a new API version";
        };

        public static readonly NewApiVersion = class {
            public static readonly questionName: string = "vsc-new-api-version";
            public static readonly funcName: string = "new-api-version-default-value";
            public static readonly description: string = "Input the API version.";
        };
    };

    public static readonly CLI = class {
        public static readonly ApimResourceGroup = class {
            public static readonly questionName: string = "apim-resource-group";
            public static readonly description: string = "The name of resource group.";
        };

        public static readonly ApimServiceName = class {
            public static readonly questionName: string = "apim-service-name";
            public static readonly description: string = "The name of the API Management service instance.";
        };

        public static readonly OpenApiDocument = class {
            public static readonly questionName: string = "open-api-document";
            public static readonly description: string = "The Open API document file path.";
        };

        public static readonly ApiPrefix = class {
            public static readonly questionName: string = "api-prefix";
            public static readonly description: string = "The API name prefix. The default unique name of the API will be '{api-prefix}-{resource-suffix}-{api-version}'.";
        };

        public static readonly ApiId = class {
            // The api id is displayed as api name in the Azure Portal
            public static readonly questionName: string = "api-name";
            public static readonly description: string = "The unique name of the api to be updated.";
        };

        public static readonly ApiVersion = class {
            public static readonly questionName: string = "api-version";
            public static readonly description: string = "The API version.";
        };
    };

}

export class ValidationConstants {
    public static readonly defaultMinLength = 1;
    public static readonly defaultMaxLength = 256;

    // https://docs.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules#microsoftresources
    public static readonly resourceGroupValidPattern = {
        regex: /^[-\w\._\(\)]+$/,
        message: "The value can include alphanumeric, underscore, parentheses, hyphen, period (except at end), and unicode characters that match the allowed characters.",
    }

    // https://docs.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules#microsoftapimanagement
    public static readonly serviceIdValidPattern = {
        regex: /^[a-zA-Z](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/,
        message: "The value can contain only letters, numbers and hyphens. The first character must be a letter and last character must be a letter or a number.",
    }

    public static readonly resourceIdValidPattern = {
        regex: /^[0-9a-zA-Z](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/,
        message: "The value can contain only numbers, letters, and hyphens when preceded and followed by number or a letter.",
    }

    public static readonly defaultValidPattern = {
        regex: /^[^*#&+:<>?]+$/,
        message: "The value cannot contain any character in '*#&+:<>?'.",
    }

    public static readonly guidValidPattern = {
        regex: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        message: "The value should be a GUID."
    }
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
