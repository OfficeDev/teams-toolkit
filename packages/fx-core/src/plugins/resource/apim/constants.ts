// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IName } from "./interfaces/IName";

export class ProjectConstants {
  public static readonly pluginShortName: string = "APIM";
  public static readonly pluginName: string = "fx-resource-apim";
  public static readonly pluginDisplayName: string = "API Management";
  public static readonly configFilePath: string = "env.default.json";
  public static readonly workingDir: string = "openapi";
  public static readonly openApiDocumentFileName: string = "openapi.json";
  public static readonly readMeFileName: string = "README.md";
  public static readonly maxRetries: number = 15;
  public static readonly retryTimeInterval: number = 1000;
  public static readonly helpLink: string = "https://aka.ms/teamsfx-apim-help";
}

export class ApimDefaultValues {
  public static readonly functionBasePath: string = "/api";
  public static readonly productDescription: string = "Created by TeamsFx.";
  public static readonly oAuthServerDescription: string = "Created by TeamsFx.";
  public static readonly enableScopeName: string = ".default";
  public static readonly userId: string = "sample@microsoft.com";
  public static readonly apiPrefix: string = "api-title";
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
    };

    public static readonly ApiPrefix = class {
      public static readonly questionName: string = "vsc-api-prefix";
      public static readonly description: string = "Input the API name prefix.";
      public static readonly prompt: string =
        "The unique name of the API will be '{api-prefix}-{resource-suffix}-{api-version}'.";
    };

    public static readonly ApiVersion = class {
      public static readonly questionName: string = "vsc-api-version";
      public static readonly description: string = "Select an API version.";
      public static readonly createNewApiVersionOption: string = "+ Create a new API version";
    };

    public static readonly NewApiVersion = class {
      public static readonly questionName: string = "vsc-new-api-version";
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
      public static readonly description: string =
        "The name of the API Management service instance.";
    };

    public static readonly OpenApiDocument = class {
      public static readonly questionName: string = "open-api-document";
      public static readonly description: string = "The Open API document file path.";
    };

    public static readonly ApiPrefix = class {
      public static readonly questionName: string = "api-prefix";
      public static readonly description: string =
        "The API name prefix. The default unique name of the API will be '{api-prefix}-{resource-suffix}-{api-version}'.";
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
    message:
      "The value can include alphanumeric, underscore, parentheses, hyphen, period (except at end), and unicode characters that match the allowed characters.",
  };

  // https://docs.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules#microsoftapimanagement
  public static readonly serviceIdValidPattern = {
    regex: /^[a-zA-Z](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/,
    message:
      "The value can contain only letters, numbers and hyphens. The first character must be a letter and last character must be a letter or a number.",
  };

  public static readonly resourceIdValidPattern = {
    regex: /^[0-9a-zA-Z](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/,
    message:
      "The value can contain only numbers, letters, and hyphens when preceded and followed by number or a letter.",
  };

  public static readonly defaultValidPattern = {
    regex: /^[^*#&+:<>?]+$/,
    message: "The value cannot contain any characters in '*#&+:<>?'.",
  };

  public static readonly guidValidPattern = {
    regex: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    message: "The value should be a GUID.",
  };

  public static readonly CLI = {
    invalidOptionMessage: (optionName: string) =>
      `The value of option '--${optionName}' is invalid.`,
    emptyOptionMessage: (optionName: string) =>
      `Option '--${optionName}' is required. Set the value of '--${optionName}'`,
    overrideOptionMessage: (optionName: string) =>
      `Option '--${optionName}' cannot be overridden. Remove option '--${optionName}'`,
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
  public static readonly resourceNameSuffix: string = "resourceNameSuffix";
  public static readonly teamsAppTenantId: string = "teamsAppTenantId";
  public static readonly resourceGroupName: string = "resourceGroupName";
  public static readonly location: string = "location";
  public static readonly remoteTeamsAppId: string = "remoteTeamsAppId";
}

export enum TeamsToolkitComponent {
  FunctionPlugin = "fx-resource-function",
  AadPlugin = "fx-resource-aad-app-for-teams",
  Solution = "solution",
  ApimPlugin = "fx-resource-apim",
}

export enum RetryOperation {
  Create = "create a new project",
  Update = "add API Management resource",
  Provision = "provision in the cloud",
  Deploy = "deploy to the cloud",
  Login = "sign in to Azure and choose a subscription",
}

export const ComponentRetryOperations: {
  [key in TeamsToolkitComponent]: RetryOperation;
} = Object.freeze({
  [TeamsToolkitComponent.FunctionPlugin]: RetryOperation.Update,
  [TeamsToolkitComponent.AadPlugin]: RetryOperation.Create,
  [TeamsToolkitComponent.Solution]: RetryOperation.Create,
  [TeamsToolkitComponent.ApimPlugin]: RetryOperation.Update,
});

export const ConfigRetryOperations: {
  [key in TeamsToolkitComponent]: { [key: string]: RetryOperation };
} = {
  [TeamsToolkitComponent.FunctionPlugin]: {
    [FunctionPluginConfigKeys.functionEndpoint]: RetryOperation.Provision,
  },
  [TeamsToolkitComponent.AadPlugin]: {
    [AadPluginConfigKeys.objectId]: RetryOperation.Provision,
    [AadPluginConfigKeys.clientId]: RetryOperation.Provision,
    [AadPluginConfigKeys.oauth2PermissionScopeId]: RetryOperation.Provision,
    [AadPluginConfigKeys.applicationIdUris]: RetryOperation.Provision,
  },
  [TeamsToolkitComponent.Solution]: {
    [SolutionConfigKeys.resourceNameSuffix]: RetryOperation.Create,
    [SolutionConfigKeys.teamsAppTenantId]: RetryOperation.Provision,
    [SolutionConfigKeys.resourceGroupName]: RetryOperation.Provision,
    [SolutionConfigKeys.location]: RetryOperation.Provision,
  },
  [TeamsToolkitComponent.ApimPlugin]: {
    [ApimPluginConfigKeys.resourceGroupName]: RetryOperation.Provision,
    [ApimPluginConfigKeys.serviceName]: RetryOperation.Provision,
    [ApimPluginConfigKeys.productId]: RetryOperation.Provision,
    [ApimPluginConfigKeys.oAuthServerId]: RetryOperation.Provision,
    [ApimPluginConfigKeys.apimClientAADObjectId]: RetryOperation.Provision,
    [ApimPluginConfigKeys.apimClientAADClientId]: RetryOperation.Provision,
    [ApimPluginConfigKeys.apimClientAADClientSecret]: RetryOperation.Provision,
    [ApimPluginConfigKeys.apiPrefix]: RetryOperation.Deploy,
    [ApimPluginConfigKeys.versionSetId]: RetryOperation.Deploy,
    [ApimPluginConfigKeys.apiPath]: RetryOperation.Deploy,
    [ApimPluginConfigKeys.apiDocumentPath]: RetryOperation.Deploy,
  },
};

export enum PluginLifeCycle {
  CallFunc = "call-func",
  GetQuestions = "get-questions",
  Scaffold = "scaffold",
  Provision = "provision",
  PostProvision = "post-provision",
  Deploy = "deploy",
  GetQuestionsForUserTask = "get-questions-for-user-task",
}

export enum ProgressStep {
  None = "",
  Scaffold = "Scaffolding OpenAPI document",
  Provision = "Provisioning API Management",
  PostProvision = "Configuring API Management",
  Deploy = "Importing API to API Management",
}

export const PluginLifeCycleToProgressStep: { [key in PluginLifeCycle]: ProgressStep } = {
  [PluginLifeCycle.CallFunc]: ProgressStep.None,
  [PluginLifeCycle.GetQuestions]: ProgressStep.None,
  [PluginLifeCycle.Scaffold]: ProgressStep.Scaffold,
  [PluginLifeCycle.Provision]: ProgressStep.Provision,
  [PluginLifeCycle.PostProvision]: ProgressStep.PostProvision,
  [PluginLifeCycle.Deploy]: ProgressStep.Deploy,
  [PluginLifeCycle.GetQuestionsForUserTask]: ProgressStep.None,
};

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

export enum OperationStatus {
  Started = "started",
  Failed = "failed",
  Succeeded = "succeeded",
}

export class AzureResource {
  static ResourceGroup: IName = {
    shortName: "resource-group",
    displayName: "Resource Group",
  };

  static APIM: IName = {
    shortName: "apim",
    displayName: "API Management Service",
  };

  static Product: IName = {
    shortName: "apim-product",
    displayName: "API Management product",
  };

  static OAuthServer: IName = {
    shortName: "apim-oauth-server",
    displayName: "API Management OAuth server",
  };

  static VersionSet: IName = {
    shortName: "apim-version-set",
    displayName: "API Management version set",
  };

  static API: IName = {
    shortName: "apim-api",
    displayName: "API Management API",
  };

  static ProductAPI: IName = {
    shortName: "apim-product-api",
    displayName: "API Management product and API relationship",
  };

  static Aad: IName = {
    shortName: "aad",
    displayName: "Azure Active Directory application",
  };

  static AadSecret: IName = {
    shortName: "aad-secret",
    displayName: "Azure Active Directory client secret",
  };

  static ServicePrincipal: IName = {
    shortName: "service-principal",
    displayName: "Service Principal",
  };
}

export class Operation {
  static Create: IName = {
    shortName: "create",
    displayName: "create",
  };

  static Update: IName = {
    shortName: "update",
    displayName: "update",
  };

  static Get: IName = {
    shortName: "get",
    displayName: "get",
  };

  static List: IName = {
    shortName: "list",
    displayName: "list",
  };

  static ListNextPage: IName = {
    shortName: "list-next",
    displayName: "list (pagination)",
  };

  static Import: IName = {
    shortName: "import",
    displayName: "import",
  };
}

export enum ErrorHandlerResult {
  Continue = "Continue",
  Return = "Return",
}

export enum OpenApiSchemaVersion {
  V2 = "v2",
  V3 = "v3",
}
