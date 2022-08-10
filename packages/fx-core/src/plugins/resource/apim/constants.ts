// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";
import { IName } from "./interfaces/IName";
import { getLocalizedString } from "../../../common/localizeUtils";

export class ProjectConstants {
  public static readonly pluginShortName: string = "APIM";
  public static readonly pluginName: string = "fx-resource-apim";
  public static readonly pluginDisplayName: string = "API Management";
  public static readonly configFilePathArmSupported = (envName: string): string =>
    `state.${envName}.json`;
  public static readonly configFilePath: string = "env.default.json";
  public static readonly workingDir: string = "openapi";
  public static readonly openApiDocumentFileName: string = "openapi.json";
  public static readonly readMeFileName: string = "README.md";
  public static readonly maxRetries: number = 15;
  public static readonly retryTimeInterval: number = 1000;
  public static readonly helpLink: string = "https://aka.ms/teamsfx-apim-help";
  public static readonly apimResourceProvider: string = "Microsoft.ApiManagement";
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
    public static readonly OpenApiDocument = class {
      public static readonly questionName: string = "vsc-open-api-document";
      public static readonly funcName: string = "open-api-document-option";
      public static readonly description: string = getLocalizedString(
        "plugins.apim.QuestionConstants.VSCode.OpenApiDocument.description"
      );
      public static readonly excludeFolders: string[] = ["node_modules"];
      public static readonly openApiDocumentFileExtensions: string[] = ["json", "yaml"];
    };

    public static readonly ExistingOpenApiDocument = class {
      // Same to OpenApiDocument.questionName
      public static readonly questionName: string = "vsc-open-api-document";
    };

    public static readonly ApiPrefix = class {
      public static readonly questionName: string = "vsc-api-prefix";
      public static readonly description: string = getLocalizedString(
        "plugins.apim.QuestionConstants.VSCode.ApiPrefix.description"
      );
      public static readonly prompt: string = getLocalizedString(
        "plugins.apim.QuestionConstants.VSCode.ApiPrefix.prompt"
      );
    };

    public static readonly ApiVersion = class {
      public static readonly questionName: string = "vsc-api-version";
      public static readonly description: string = getLocalizedString(
        "plugins.apim.QuestionConstants.VSCode.ApiVersion.description"
      );
      public static readonly createNewApiVersionOption: string = getLocalizedString(
        "plugins.apim.QuestionConstants.VSCode.ApiVersion.createNewApiVersionOption"
      );
    };

    public static readonly NewApiVersion = class {
      public static readonly questionName: string = "vsc-new-api-version";
      public static readonly description: string = getLocalizedString(
        "plugins.apim.QuestionConstants.VSCode.NewApiVersion.description"
      );
    };
  };

  public static readonly CLI = class {
    public static readonly OpenApiDocument = class {
      public static readonly questionName: string = "open-api-document";
      public static readonly description: string = getLocalizedString(
        "plugins.apim.QuestionConstants.CLI.OpenApiDocument.description"
      );
    };

    public static readonly ApiPrefix = class {
      public static readonly questionName: string = "api-prefix";
      public static readonly description: string = getLocalizedString(
        "plugins.apim.QuestionConstants.CLI.ApiPrefix.description"
      );
    };

    public static readonly ApiId = class {
      // The api id is displayed as api name in the Azure Portal
      public static readonly questionName: string = "api-name";
      public static readonly description: string = getLocalizedString(
        "plugins.apim.QuestionConstants.CLI.ApiId.description"
      );
    };

    public static readonly ApiVersion = class {
      public static readonly questionName: string = "api-version";
      public static readonly description: string = getLocalizedString(
        "plugins.apim.QuestionConstants.CLI.ApiVersion.description"
      );
    };
  };
}

export class ValidationConstants {
  public static readonly defaultMinLength = 1;
  public static readonly defaultMaxLength = 256;

  public static readonly resourceIdValidPattern = {
    regex: /^[0-9a-zA-Z](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/,
    message: getLocalizedString("plugins.apim.ValidationConstants.resourceIdValidPattern.message"),
  };

  public static readonly defaultValidPattern = {
    regex: /^[^*#&+:<>?]+$/,
    message: getLocalizedString("plugins.apim.ValidationConstants.defaultValidPattern.message"),
  };

  public static readonly guidValidPattern = {
    regex: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    message: getLocalizedString("plugins.apim.ValidationConstants.guidValidPattern.message"),
  };

  public static readonly CLI = {
    invalidOptionMessage: (optionName: string) =>
      getLocalizedString("plugins.apim.ValidationConstants.CLI.invalidOptionMessage", optionName),
    emptyOptionMessage: (optionName: string) =>
      getLocalizedString(
        "plugins.apim.ValidationConstants.CLI.emptyOptionMessage",
        optionName,
        optionName
      ),
    overrideOptionMessage: (optionName: string) =>
      getLocalizedString(
        "plugins.apim.ValidationConstants.CLI.overrideOptionMessage",
        optionName,
        optionName
      ),
  };
}

export class ApimPathInfo {
  public static readonly BicepTemplateRelativeDir = path.join(
    "plugins",
    "resource",
    "apim",
    "bicep"
  );

  static readonly ProvisionModuleFileName = "apimProvision.bicep";
  static readonly ConfigurationModuleFileName = "apimConfiguration.bicep";
}

export class ApimPluginConfigKeys {
  public static readonly apimClientAADObjectId: string = "apimClientAADObjectId";
  public static readonly apimClientAADClientId: string = "apimClientAADClientId";
  public static readonly apimClientAADClientSecret: string = "apimClientAADClientSecret";
  public static readonly apiPrefix: string = "apiPrefix";
  public static readonly versionSetId: string = "versionSetId";
  public static readonly apiPath: string = "apiPath";
  public static readonly apiDocumentPath: string = "apiDocumentPath";
  public static readonly serviceResourceId: string = "serviceResourceId";
  public static readonly productResourceId: string = "productResourceId";
  public static readonly authServerResourceId: string = "authServerResourceId";
  public static readonly publisherEmail: string = "publisherEmail";
  public static readonly publisherName: string = "publisherName";
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
  public static readonly subscriptionId: string = "subscriptionId";
}

export enum TeamsToolkitComponent {
  FunctionPlugin = "fx-resource-function",
  AadPlugin = "fx-resource-aad-app-for-teams",
  Solution = "solution",
  ApimPlugin = "fx-resource-apim",
}

export enum TeamsToolkitComponentV3 {
  FunctionPlugin = "teams-api",
  AadPlugin = "aad-app",
  Solution = "solution",
  ApimPlugin = "apim",
}

export const RetryOperation = Object.freeze({
  Create: getLocalizedString("plugins.apim.RetryOperation.Create"),
  Update: getLocalizedString("plugins.apim.RetryOperation.Update"),
  Provision: getLocalizedString("plugins.apim.RetryOperation.Provision"),
  Deploy: getLocalizedString("plugins.apim.RetryOperation.Deploy"),
  Login: getLocalizedString("plugins.apim.RetryOperation.Login"),
});

export type RetryOperation = typeof RetryOperation[keyof typeof RetryOperation];

export const ComponentRetryOperations: {
  [key in TeamsToolkitComponent | TeamsToolkitComponentV3]: RetryOperation;
} = Object.freeze({
  [TeamsToolkitComponent.FunctionPlugin]: RetryOperation.Update,
  [TeamsToolkitComponent.AadPlugin]: RetryOperation.Create,
  [TeamsToolkitComponent.Solution]: RetryOperation.Create,
  [TeamsToolkitComponent.ApimPlugin]: RetryOperation.Update,
  [TeamsToolkitComponentV3.FunctionPlugin]: RetryOperation.Update,
  [TeamsToolkitComponentV3.AadPlugin]: RetryOperation.Create,
  [TeamsToolkitComponentV3.Solution]: RetryOperation.Create,
  [TeamsToolkitComponentV3.ApimPlugin]: RetryOperation.Update,
});

export const ConfigRetryOperations: {
  [key in TeamsToolkitComponent | TeamsToolkitComponentV3]: { [key: string]: RetryOperation };
} = {
  [TeamsToolkitComponent.FunctionPlugin]: {
    [FunctionPluginConfigKeys.functionEndpoint]: RetryOperation.Provision,
  },
  [TeamsToolkitComponentV3.FunctionPlugin]: {
    [FunctionPluginConfigKeys.functionEndpoint]: RetryOperation.Provision,
  },
  [TeamsToolkitComponent.AadPlugin]: {
    [AadPluginConfigKeys.objectId]: RetryOperation.Provision,
    [AadPluginConfigKeys.clientId]: RetryOperation.Provision,
    [AadPluginConfigKeys.oauth2PermissionScopeId]: RetryOperation.Provision,
    [AadPluginConfigKeys.applicationIdUris]: RetryOperation.Provision,
  },
  [TeamsToolkitComponentV3.AadPlugin]: {
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
    [ApimPluginConfigKeys.apimClientAADObjectId]: RetryOperation.Provision,
    [ApimPluginConfigKeys.apimClientAADClientId]: RetryOperation.Provision,
    [ApimPluginConfigKeys.apimClientAADClientSecret]: RetryOperation.Provision,
    [ApimPluginConfigKeys.serviceResourceId]: RetryOperation.Provision,
    [ApimPluginConfigKeys.productResourceId]: RetryOperation.Provision,
    [ApimPluginConfigKeys.authServerResourceId]: RetryOperation.Provision,
    [ApimPluginConfigKeys.publisherEmail]: RetryOperation.Provision,
    [ApimPluginConfigKeys.publisherName]: RetryOperation.Provision,
    [ApimPluginConfigKeys.apiPrefix]: RetryOperation.Deploy,
    [ApimPluginConfigKeys.versionSetId]: RetryOperation.Deploy,
    [ApimPluginConfigKeys.apiPath]: RetryOperation.Deploy,
    [ApimPluginConfigKeys.apiDocumentPath]: RetryOperation.Deploy,
  },
  [TeamsToolkitComponentV3.ApimPlugin]: {
    [ApimPluginConfigKeys.apimClientAADObjectId]: RetryOperation.Provision,
    [ApimPluginConfigKeys.apimClientAADClientId]: RetryOperation.Provision,
    [ApimPluginConfigKeys.apimClientAADClientSecret]: RetryOperation.Provision,
    [ApimPluginConfigKeys.serviceResourceId]: RetryOperation.Provision,
    [ApimPluginConfigKeys.productResourceId]: RetryOperation.Provision,
    [ApimPluginConfigKeys.authServerResourceId]: RetryOperation.Provision,
    [ApimPluginConfigKeys.publisherEmail]: RetryOperation.Provision,
    [ApimPluginConfigKeys.publisherName]: RetryOperation.Provision,
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
  GenerateArmTemplates = "generate-arm-templates",
  UpdateArmTemplates = "update-arm-templates",
  PostProvision = "post-provision",
  Deploy = "deploy",
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
  [PluginLifeCycle.GenerateArmTemplates]: ProgressStep.None,
  [PluginLifeCycle.UpdateArmTemplates]: ProgressStep.None,
  [PluginLifeCycle.PostProvision]: ProgressStep.PostProvision,
  [PluginLifeCycle.Deploy]: ProgressStep.Deploy,
};

export const ProgressMessages: { [key in ProgressStep]: { [step: string]: string } } = {
  [ProgressStep.None]: {},
  [ProgressStep.Scaffold]: {
    Scaffold: getLocalizedString("plugins.apim.ProgressMessages.Scaffold.Scaffold"),
  },
  [ProgressStep.Provision]: {
    CreateApim: getLocalizedString("plugins.apim.ProgressMessages.Provision.CreateApim"),
    CreateAad: getLocalizedString("plugins.apim.ProgressMessages.Provision.CreateAad"),
  },
  [ProgressStep.PostProvision]: {
    ConfigClientAad: getLocalizedString(
      "plugins.apim.ProgressMessages.PostProvision.ConfigClientAad"
    ),
    ConfigAppAad: getLocalizedString("plugins.apim.ProgressMessages.PostProvision.ConfigAppAad"),
  },
  [ProgressStep.Deploy]: {
    ImportApi: getLocalizedString("plugins.apim.ProgressMessages.Deploy.ImportApi"),
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

  static ResourceProvider: IName = {
    shortName: "resource-provider",
    displayName: "Resource Provider",
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

  static Register: IName = {
    shortName: "register",
    displayName: "register",
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

export class UserTask {
  static addResourceFuncName = "addResource";
  static addFeatureFuncName = "addFeature";
}

export class ApimOutputBicepSnippet {
  static readonly ServiceResourceId = "provisionOutputs.apimOutput.value.serviceResourceId";
}
