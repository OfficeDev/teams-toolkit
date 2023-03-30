// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * @author Huajie Zhang <huajiezhang@microsoft.com>
 */
import { MultiSelectQuestion, OptionItem, UserError } from "@microsoft/teamsfx-api";
import { RestError } from "@azure/ms-rest-js";
import path from "path";
import { getLocalizedString } from "../common/localizeUtils";

export const ComponentNames = {
  TeamsTab: "teams-tab",
  TeamsBot: "teams-bot",
  TeamsApi: "teams-api",
  AppManifest: "app-manifest",
  AadApp: "aad-app",
  AzureWebApp: "azure-web-app",
  AzureStorage: "azure-storage",
  BotService: "bot-service",
  SPFxTab: "spfx-tab",
  SPFx: "spfx",
  Identity: "identity",
  APIMFeature: "apim-feature",
  APIM: "apim",
  KeyVault: "key-vault",
  AzureSQL: "azure-sql",
  TabCode: "tab-code",
  BotCode: "bot-code",
  SPFxTabCode: "spfx-tab-code",
  ApiCode: "api-code",
  Function: "azure-function",
  SimpleAuth: "simple-auth",
  SSO: "sso",
  ApiConnector: "api-connector",
  CICD: "cicd",
};

export const AzureResources = [
  ComponentNames.APIM,
  ComponentNames.AzureWebApp,
  ComponentNames.Function,
  ComponentNames.Identity,
  ComponentNames.KeyVault,
  ComponentNames.AzureSQL,
  ComponentNames.AzureStorage,
];

export enum Scenarios {
  Tab = "Tab",
  Bot = "Bot",
  Api = "Api",
}

export const componentToScenario = new Map([
  [ComponentNames.TeamsApi, Scenarios.Api],
  [ComponentNames.TeamsBot, Scenarios.Bot],
  [ComponentNames.TeamsTab, Scenarios.Tab],
]);

export const scenarioToComponent = new Map([
  [Scenarios.Api, ComponentNames.TeamsApi],
  [Scenarios.Bot, ComponentNames.TeamsBot],
  [Scenarios.Tab, ComponentNames.TeamsTab],
]);

export enum ProgrammingLanguage {
  JS = "javascript",
  TS = "typescript",
  CSharp = "csharp",
}

export enum Runtime {
  nodejs = "node",
  dotnet = "dotnet",
}

export const languageToRuntime = new Map([
  [ProgrammingLanguage.JS, Runtime.nodejs],
  [ProgrammingLanguage.TS, Runtime.nodejs],
  [ProgrammingLanguage.CSharp, Runtime.dotnet],
]);

export const ActionNames = {
  provision: "provision",
  configure: "configure",
  generateBicep: "generateBicep",
};

export const ActionTypeFunction = "function";
export const ActionTypeCall = "call";
export const ActionTypeGroup = "group";
export const ActionTypeShell = "shell";

export const BicepConstants = {
  writeFile: "1",
};

export const TelemetryConstants = {
  eventPrefix: "-start",
  properties: {
    component: "component",
    appId: "appid",
    tenantId: "tenant-id",
    success: "success",
    errorCode: "error-code",
    errorType: "error-type",
    errorMessage: "error-message",
    timeCost: "time-cost",
  },
  values: {
    yes: "yes",
    no: "no",
    userError: "user",
    systemError: "system",
  },
};

export const ErrorConstants = {
  unhandledError: "UnhandledError",
  unhandledErrorMessage: "Unhandled Error",
};

export const AzureSqlOutputs = {
  sqlResourceId: {
    key: "sqlResourceId",
    bicepVariable: "provisionOutputs.azureSqlOutput.value.sqlResourceId",
  },
  sqlEndpoint: {
    key: "sqlEndpoint",
    bicepVariable: "provisionOutputs.azureSqlOutput.value.sqlEndpoint",
  },
  databaseName: {
    key: "databaseName",
    bicepVariable: "provisionOutputs.azureSqlOutput.value.databaseName",
  },
};

export const IdentityOutputs = {
  identityResourceId: {
    key: "identityResourceId",
    bicepVariable: "userAssignedIdentityProvision.outputs.identityResourceId",
  },
  identityName: {
    key: "identityName",
    bicepVariable: "provisionOutputs.identityOutput.value.identityName",
  },
  identityClientId: {
    key: "identityClientId",
    bicepVariable: "provisionOutputs.identityOutput.value.identityClientId",
  },
  identityPrincipalId: {
    key: "identityPrincipalId",
    bicepVariable: "userAssignedIdentityProvision.outputs.identityPrincipalId",
  },
};

export const KeyVaultOutputs = {
  keyVaultResourceId: {
    key: "keyVaultResourceId",
    bicepVariable: "provisionOutputs.keyVaultOutput.value.keyVaultResourceId",
  },
  m365ClientSecretReference: {
    key: "m365ClientSecretReference",
    bicepVariable: "provisionOutputs.keyVaultOutput.value.m365ClientSecretReference",
  },
  botClientSecretReference: {
    key: "botClientSecretReference",
    bicepVariable: "provisionOutputs.keyVaultOutput.value.botClientSecretReference",
  },
};

export const APIMOutputs = {
  serviceResourceId: {
    key: "serviceResourceId",
    bicepVariable: "provisionOutputs.apimOutput.value.serviceResourceId",
  },
  productResourceId: {
    key: "productResourceId",
    bicepVariable: "provisionOutputs.apimOutput.value.productResourceId",
  },
  authServerResourceId: {
    key: "authServerResourceId",
  },
  apimClientAADObjectId: {
    key: "apimClientAADObjectId",
  },
  apimClientAADClientId: {
    key: "apimClientAADClientId",
  },
  apimClientAADClientSecret: {
    key: "apimClientAADClientSecret",
  },
};

export const WebAppOutputs = {
  resourceId: {
    key: "resourceId",
    bicepVariable: "provisionOutputs.azureWebApp{{scenario}}Output.value.resourceId",
  },
  endpoint: {
    key: "siteEndpoint",
    bicepVariable: "provisionOutputs.azureWebApp{{scenario}}Output.value.siteEndpoint",
  },
  endpointAsParam: {
    key: "siteEndpointAsParam",
    bicepVariable: "azureWebApp{{scenario}}Provision.outputs.siteEndpoint",
  },
};

export const FunctionOutputs = {
  resourceId: {
    key: "functionAppResourceId",
    bicepVariable: "provisionOutputs.azureFunction{{scenario}}Output.value.functionAppResourceId",
  },
  endpoint: {
    key: "functionEndpoint",
    bicepVariable: "provisionOutputs.azureFunction{{scenario}}Output.value.functionEndpoint",
  },
  endpointAsParam: {
    key: "functionEndpointAsParam",
    bicepVariable: "azureFunction{{scenario}}Provision.outputs.functionEndpoint",
  },
};

export const StorageOutputs = {
  endpoint: {
    key: "endpoint",
    bicepVariable: "provisionOutputs.azureStorage{{scenario}}Output.value.endpoint",
  },
  storageResourceId: {
    key: "storageResourceId",
    bicepVariable: "provisionOutputs.azureStorage{{scenario}}Output.value.storageResourceId",
  },
  domain: {
    key: "domain",
    bicepVariable: "provisionOutputs.azureStorage{{scenario}}Output.value.domain",
  },
  indexPath: {
    key: "indexPath",
    bicepVariable: "provisionOutputs.azureStorage{{scenario}}Output.value.indexPath",
  },
};

export const BotServiceOutputs = {
  botId: {
    key: "botId",
  },
  botPassword: {
    key: "botPassword",
  },
};

export const AadAppOutputs = {
  applicationIdUris: {
    key: "applicationIdUris",
  },
  clientId: {
    key: "clientId",
  },
  clientSecret: {
    key: "clientSecret",
  },
  objectId: {
    key: "objectId",
  },
  oauth2PermissionScopeId: {
    key: "oauth2PermissionScopeId",
  },
  frontendEndpoint: {
    key: "frontendEndpoint",
  },
  botId: {
    key: "botId",
  },
  botEndpoint: {
    key: "botEndpoint",
  },
  domain: {
    key: "domain",
  },
  endpoint: {
    key: "endpoint",
  },
  oauthAuthority: {
    key: "oauthAuthority",
  },
  oauthHost: {
    key: "oauthHost",
  },
  tenantId: {
    key: "tenantId",
  },
};

export const FunctionAppSetting = {
  keys: {
    allowedAppIds: "ALLOWED_APP_IDS",
  },
  allowedAppIdSep: ";",
};

export const PathConstants = {
  botWorkingDir: "bot",
  apiWorkingDir: "api",
  tabWorkingDir: "tabs",
  dotnetWorkingDir: ".",
  npmPackageFolder: "node_modules",
  nodePackageFile: "package.json",
  functionExtensionsFolder: "bin",
  functionExtensionsFile: "extensions.csproj",
  deploymentInfoFolder: ".deployment",
  deploymentInfoFile: "deployment.json",
  nodeArtifactFolder: "build",
  dotnetArtifactFolder: "publish",
  reactTabIndexPath: "/index.html#",
  blazorTabIndexPath: "/",
};

export const RegularExpr = {
  validFunctionNamePattern: /^[a-zA-Z][\w-]{0,126}$/,
};

/**
 * Void is used to construct Result<Void, FxError>.
 * e.g. return ok(Void);
 * It exists because ok(void) does not compile.
 */
export const Void = {};

/**
 * The key of global config visible to all resource plugins.
 */
export const GLOBAL_CONFIG = "solution";
// export const SELECTED_PLUGINS = "selectedPlugins";

/**
 * Used to track whether provision succeeded
 * Set to true when provison succeeds, to false when a new resource is added.
 */
export const SOLUTION_PROVISION_SUCCEEDED = "provisionSucceeded";

/**
 * Config key whose value is either javascript, typescript or csharp.
 */
export const PROGRAMMING_LANGUAGE = "programmingLanguage";

/**
 * Config key whose value is the default function name for adding a new function.
 */
export const DEFAULT_FUNC_NAME = "defaultFunctionName";

/**
 * Config key whose value is output of ARM templates deployment.
 */
export const ARM_TEMPLATE_OUTPUT = "armTemplateOutput";
export const TEAMS_FX_RESOURCE_ID_KEY = "teamsFxPluginId";

/**
 * Config key whose value is the resource group name of project.
 */
export const RESOURCE_GROUP_NAME = "resourceGroupName";

/**
 * Config key whose value is the resource group location of project.
 */
export const LOCATION = "location";

/**
 * Config key whose value is the subscription ID of project.
 */
export const SUBSCRIPTION_ID = "subscriptionId";

/**
 * Config key whose value is the subscription name of project.
 */
export const SUBSCRIPTION_NAME = "subscriptionName";

export const DEFAULT_PERMISSION_REQUEST = [
  {
    resource: "Microsoft Graph",
    delegated: ["User.Read"],
    application: [],
  },
];

export enum PluginNames {
  SQL = "fx-resource-azure-sql",
  MSID = "fx-resource-identity",
  FE = "fx-resource-frontend-hosting",
  SPFX = "fx-resource-spfx",
  BOT = "fx-resource-bot",
  AAD = "fx-resource-aad-app-for-teams",
  FUNC = "fx-resource-function",
  SA = "fx-resource-simple-auth",
  LDEBUG = "fx-resource-local-debug",
  APIM = "fx-resource-apim",
  APPST = "fx-resource-appstudio",
  SOLUTION = "solution",
}
export const BuiltInFeaturePluginNames = {
  appStudio: "fx-resource-appstudio",
  aad: "fx-resource-aad-app-for-teams",
  bot: "fx-resource-bot",
  function: "fx-resource-function",
  frontend: "fx-resource-frontend-hosting",
  spfx: "fx-resource-spfx",
  simpleAuth: "fx-resource-simple-auth",
  identity: "fx-resource-identity",
  apim: "fx-resource-apim",
  keyVault: "fx-resource-key-vault",
  sql: "fx-resource-azure-sql",
};
export enum SolutionError {
  InvalidSelectedPluginNames = "InvalidSelectedPluginNames",
  PluginNotFound = "PluginNotFound",
  AADPluginNotEnabled = "AADPluginNotEnabled",
  MissingPermissionsJson = "MissingPermissionsJson",
  DialogIsNotPresent = "DialogIsNotPresent",
  NoResourcePluginSelected = "NoResourcePluginSelected",
  NoAppStudioToken = "NoAppStudioToken",
  NoTeamsAppTenantId = "NoTeamsAppTenantId",
  NoUserName = "NoUserName",
  FailedToCreateResourceGroup = "FailedToCreateResourceGroup",
  FailedToListResourceGroup = "FailedToListResourceGrouop",
  FailedToListResourceGroupLocation = "FailedToListResourceGroupLocation",
  FailedToGetResourceGroupInfoInputs = "FailedToGetResourceGroupInfoInputs",
  ResourceGroupNotFound = "ResourceGroupNotFound",
  SubscriptionNotFound = "SubscriptionNotFound",
  NotLoginToAzure = "NotLoginToAzure",
  AzureAccountExtensionNotInitialized = "AzureAccountExtensionNotInitialized",
  LocalTabEndpointMissing = "LocalTabEndpointMissing",
  LocalTabDomainMissing = "LocalTabDomainMissing",
  LocalClientIDMissing = "LocalDebugClientIDMissing",
  LocalApplicationIdUrisMissing = "LocalApplicationIdUrisMissing",
  LocalClientSecretMissing = "LocalClientSecretMissing",
  CannotUpdatePermissionForSPFx = "CannotUpdatePermissionForSPFx",
  CannotAddResourceForSPFx = "CannotAddResourceForSPFx",
  FailedToParseAzureTenantId = "FailedToParseAzureTenantId",
  CannotRunProvisionInSPFxProject = "CannotRunProvisionInSPFxProject",
  CannotRunThisTaskInSPFxProject = "CannotRunThisTaskInSPFxProject",
  FrontendEndpointAndDomainNotFound = "FrontendEndpointAndDomainNotFound",
  RemoteClientIdNotFound = "RemoteClientIdNotFound",
  AddResourceNotSupport = "AddResourceNotSupport",
  AddCapabilityNotSupport = "AddCapabilityNotSupport",
  FailedToAddCapability = "FailedToAddCapability",
  NoResourceToDeploy = "NoResourceToDeploy",
  ProvisionInProgress = "ProvisionInProgress",
  DeploymentInProgress = "DeploymentInProgress",
  PublishInProgress = "PublishInProgress",
  UnknownSolutionRunningState = "UnknownSolutionRunningState",
  CannotDeployBeforeProvision = "CannotDeployBeforeProvision",
  CannotPublishBeforeProvision = "CannotPublishBeforeProvision",
  CannotLocalDebugInDifferentTenant = "CannotLocalDebugInDifferentTenant",
  NoSubscriptionFound = "NoSubscriptionFound",
  NoSubscriptionSelected = "NoSubscriptionSelected",
  FailedToGetParamForRegisterTeamsAppAndAad = "FailedToGetParamForRegisterTeamsAppAndAad",
  BotInternalError = "BotInternalError",
  InternelError = "InternelError",
  RegisterTeamsAppAndAadError = "RegisterTeamsAppAndAadError",
  GetLocalDebugConfigError = "GetLocalDebugConfigError",
  GetRemoteConfigError = "GetRemoteConfigError",
  UnsupportedPlatform = "UnsupportedPlatform",
  InvalidInput = "InvalidInput",
  FailedToCompileBicepFiles = "FailedToCompileBicepFiles",
  FailedToGetAzureCredential = "FailedToGetAzureCredential",
  FailedToGenerateArmTemplates = "FailedToGenerateArmTemplates",
  FailedToUpdateArmParameters = "FailedToUpdateArmTemplates",
  FailedToDeployArmTemplatesToAzure = "FailedToDeployArmTemplatesToAzure",
  FailedToPollArmDeploymentStatus = "FailedToPollArmDeploymentStatus",
  FailedToValidateArmTemplates = "FailedToValidateArmTemplates",
  FailedToRetrieveUserInfo = "FailedToRetrieveUserInfo",
  FeatureNotSupported = "FeatureNotSupported",
  CannotFindUserInCurrentTenant = "CannotFindUserInCurrentTenant",
  FailedToGrantPermission = "FailedToGrantPermission",
  FailedToCheckPermission = "FailedToCheckPermission",
  FailedToListCollaborator = "FailedToListCollaborator",
  EmailCannotBeEmptyOrSame = "EmailCannotBeEmptyOrSame",
  FailedToExecuteTasks = "FailedToExecuteTasks",
  FailedToGetEnvName = "FailedToGetEnvName",
  TeamsAppTenantIdNotRight = "TeamsAppTenantIdNotRight",
  AddSsoNotSupported = "AddSsoNotSupported",
  NeedEnableFeatureFlag = "NeedEnableFeatureFlag",
  SsoEnabled = "SsoEnabled",
  InvalidSsoProject = "InvalidSsoProject",
  InvalidProjectPath = "InvalidProjectPath",
  FailedToCreateAuthFiles = "FailedToCreateAuthFiles",
  FailedToUpdateAzureParameters = "FailedToUpdateAzureParameters",
  FailedToBackupFiles = "FailedToBackupFiles",
  MissingSubscriptionIdInConfig = "MissingSubscriptionIdInConfig",
  FailedToResetAppSettingsDevelopment = "FailedToResetAppSettingsDevelopment",
  FailedToLoadDotEnvFile = "FailedToLoadDotEnvFile",
  FailedToGetTeamsAppId = "FailedToGetTeamsAppId",
  InvalidManifestError = "InvalidManifestError",
  FailedToLoadManifestFile = "FailedToLoadManifestFile",
}

export const LOCAL_DEBUG_TAB_ENDPOINT = "localTabEndpoint";
export const LOCAL_DEBUG_TAB_DOMAIN = "localTabDomain";
export const LOCAL_DEBUG_BOT_DOMAIN = "localBotDomain";
export const BOT_DOMAIN = "validDomain";
export const BOT_SECTION = "bots";
export const COMPOSE_EXTENSIONS_SECTION = "composeExtensions";
export const LOCAL_WEB_APPLICATION_INFO_SOURCE = "local_applicationIdUris";
export const WEB_APPLICATION_INFO_SOURCE = "applicationIdUris";
export const LOCAL_DEBUG_AAD_ID = "local_clientId";
export const REMOTE_AAD_ID = "clientId";
export const LOCAL_APPLICATION_ID_URIS = "local_applicationIdUris";
export const REMOTE_APPLICATION_ID_URIS = "applicationIdUris";
export const LOCAL_CLIENT_SECRET = "local_clientSecret";
export const REMOTE_CLIENT_SECRET = "clientSecret";
export const REMOTE_TEAMS_APP_TENANT_ID = "teamsAppTenantId";
export const LOCAL_TENANT_ID = "local_tenantId";
// Teams App Id for local debug
export const LOCAL_DEBUG_TEAMS_APP_ID = "localDebugTeamsAppId";
// Teams App Id for remote
export const REMOTE_TEAMS_APP_ID = "remoteTeamsAppId";
export const TEAMS_APP_ID = "teamsAppId";

export const AzureRoleAssignmentsHelpLink =
  "https://aka.ms/teamsfx-azure-role-assignments-help-link";
export const SharePointManageSiteAdminHelpLink =
  "https://aka.ms/teamsfx-sharepoint-manage-site-admin-help-link";

export const ViewAadAppHelpLink = "https://aka.ms/teamsfx-view-aad-app";

export const DoProvisionFirstError = new UserError(
  "DoProvisionFirst",
  "DoProvisionFirst",
  "Solution"
);
export const CancelError = new UserError("Solution", "UserCancel", "UserCancel");
// This is the max length specified in
// https://developer.microsoft.com/en-us/json-schemas/teams/v1.7/MicrosoftTeams.schema.json

export enum SolutionTelemetryEvent {
  CreateStart = "create-start",
  Create = "create",

  AddResourceStart = "add-resource-start",
  AddResource = "add-resource",

  AddCapabilityStart = "add-capability-start",
  AddCapability = "add-capability",

  GrantPermissionStart = "grant-permission-start",
  GrantPermission = "grant-permission",

  CheckPermissionStart = "check-permission-start",
  CheckPermission = "check-permission",

  ListCollaboratorStart = "list-collaborator-start",
  ListCollaborator = "list-collaborator",

  GenerateArmTemplateStart = "generate-armtemplate-start",
  GenerateArmTemplate = "generate-armtemplate",

  ArmDeploymentStart = "deploy-armtemplate-start",
  ArmDeployment = "deploy-armtemplate",

  AddSsoStart = "add-sso-start",
  AddSso = "add-sso",
  AddSsoReadme = "add-sso-readme",

  DeployStart = "deploy-start",
  Deploy = "deploy",

  ProvisionStart = "provision-start",
  Provision = "provision",
}

export enum SolutionTelemetryProperty {
  Component = "component",
  Resources = "resources",
  Capabilities = "capabilities",
  Success = "success",
  CollaboratorCount = "collaborator-count",
  AadOwnerCount = "aad-owner-count",
  AadPermission = "aad-permission",
  ArmDeploymentError = "arm-deployment-error",
  TeamsAppPermission = "teams-app-permission",
  ProgrammingLanguage = "programming-language",
  Env = "env",
  IncludeAadManifest = "include-aad-manifest",
  ErrorCode = "error-code",
  ErrorMessage = "error-message",
  HostType = "host-type",
  SubscriptionId = "subscription-id",
  AddTabSso = "tab-sso",
  AddBotSso = "bot-sso",
  M365TenantId = "m365-tenant-id",
  PreviousSubsriptionId = "previous-subscription-id",
  PreviousM365TenantId = "previous-m365-tenant-id",
  ConfirmRes = "confirm-res",
}

export enum SolutionTelemetrySuccess {
  Yes = "yes",
  No = "no",
}

export const SolutionTelemetryComponentName = "solution";
export const SolutionSource = "Solution";
export const CoordinatorSource = "coordinator";

export class UnauthorizedToCheckResourceGroupError extends UserError {
  constructor(resourceGroupName: string, subscriptionId: string, subscriptionName: string) {
    const subscriptionInfoString =
      subscriptionId + (subscriptionName.length > 0 ? `(${subscriptionName})` : "");
    super(
      SolutionSource,
      new.target.name,
      getLocalizedString("error.rgUnauthorizedError", resourceGroupName, subscriptionInfoString)
    );
  }
}

export class FailedToCheckResourceGroupExistenceError extends UserError {
  constructor(
    error: unknown,
    resourceGroupName: string,
    subscriptionId: string,
    subscriptionName: string
  ) {
    const subscriptionInfoString =
      subscriptionId + (subscriptionName.length > 0 ? `(${subscriptionName})` : "");
    const baseErrorMessage = getLocalizedString(
      "error.rgCheckBaseError",
      resourceGroupName,
      subscriptionInfoString
    );

    if (error instanceof RestError) {
      // Avoid sensitive information like request headers in the error message.
      const rawErrorString = JSON.stringify({
        code: error.code,
        statusCode: error.statusCode,
        body: error.body,
        name: error.name,
        message: error.message,
      });

      super(SolutionSource, new.target.name, `${baseErrorMessage}, error: '${rawErrorString}'`);
    } else if (error instanceof Error) {
      // Reuse the original error object to prevent losing the stack info
      error.message = `${baseErrorMessage}, error: '${error.message}'`;
      super({ error, source: SolutionSource });
    } else {
      super(
        SolutionSource,
        new.target.name,
        `${baseErrorMessage}, error: '${JSON.stringify(error)}'`
      );
    }
  }
}

export enum Language {
  JavaScript = "javascript",
  TypeScript = "typescript",
  CSharp = "csharp",
}

export class AddSsoParameters {
  static readonly filePath = path.join("plugins", "resource", "aad", "auth");
  static readonly Bot = "bot";
  static readonly Tab = "tab";
  static readonly V3 = "V3";
  static readonly V3AuthFolder = "TeamsFx-Auth";
  static readonly Readme = "README.md";
  static readonly ReadmeCSharp = "README.txt";
  static readonly LearnMore = () => getLocalizedString("core.provision.learnMore");
  static readonly LearnMoreUrl = "https://aka.ms/teamsfx-add-sso-readme";
  static readonly AddSso = "addSso";
  static readonly AppSettings = "appsettings.json";
  static readonly AppSettingsDev = "appsettings.Development.json";
  static readonly AppSettingsToAdd = {
    Authentication: {
      ClientId: "$clientId$",
      ClientSecret: "$client-secret$",
      OAuthAuthority: "$oauthAuthority$",
    },
  };
  static readonly AppSettingsToAddForBot = {
    Authentication: {
      ClientId: "$clientId$",
      ClientSecret: "$client-secret$",
      OAuthAuthority: "$oauthAuthority$",
      ApplicationIdUri: "$applicationIdUri$",
      Bot: {
        InitiateLoginEndpoint: "$initiateLoginEndpoint$",
      },
    },
  };
}

export class UserTaskFunctionName {
  static readonly ConnectExistingApi = "connectExistingApi";
}

export interface ProvisionSubscriptionCheckResult {
  hasSwitchedSubscription: boolean;
}

export type FillInAzureConfigsResult = ProvisionSubscriptionCheckResult;

export function TabOptionItem(): OptionItem {
  return {
    id: "Tab",
    label: getLocalizedString("core.TabOption.label"),
    cliName: "tab",
    description: getLocalizedString("core.TabOption.description"),
    detail: getLocalizedString("core.TabOption.detail"),
  };
}

export function TabNewUIOptionItem(): OptionItem {
  return {
    id: "Tab",
    label: `$(browser) ${getLocalizedString("core.TabOption.labelNew")}`,
    cliName: "tab",
    detail: getLocalizedString("core.TabOption.detailNew"),
    groupName: getLocalizedString("core.options.separator.scenario"),
    data: "https://aka.ms/teamsfx-tab-with-sso",
    buttons: [
      {
        iconPath: "file-symlink-file",
        tooltip: getLocalizedString("core.option.github"),
        command: "fx-extension.openTutorial",
      },
    ],
  };
}

export function DashboardOptionItem(): OptionItem {
  return {
    id: "dashboard-tab",
    label: `$(browser) ${getLocalizedString("core.DashboardOption.label")}`,
    description: getLocalizedString("core.Option.preview"),
    cliName: "dashboard-tab",
    detail: getLocalizedString("core.DashboardOption.detail"),
    groupName: getLocalizedString("core.options.separator.scenario"),
    data: "https://aka.ms/teamsfx-dashboard-app",
    buttons: [
      {
        iconPath: "file-symlink-file",
        tooltip: getLocalizedString("core.option.github"),
        command: "fx-extension.openTutorial",
      },
    ],
  };
}

export function BotOptionItem(): OptionItem {
  return {
    id: "Bot",
    label: "Bot",
    cliName: "bot",
    description: getLocalizedString("core.BotOption.description"),
    detail: getLocalizedString("core.BotOption.detail"),
  };
}

export function BotNewUIOptionItem(): OptionItem {
  return {
    id: "Bot",
    label: `$(hubot) ${getLocalizedString("core.BotNewUIOption.label")}`,
    cliName: "bot",
    detail: getLocalizedString("core.BotNewUIOption.detail"),
    groupName: getLocalizedString("core.options.separator.basic"),
  };
}

export function NotificationOptionItem(): OptionItem {
  return {
    // For default option, id and cliName must be the same
    id: "Notification",
    label: `$(hubot) ${getLocalizedString("core.NotificationOption.label")}`,
    description: getLocalizedString("core.Option.recommend"),
    cliName: "notification",
    detail: getLocalizedString("core.NotificationOption.detail"),
    groupName: getLocalizedString("core.options.separator.scenario"),
    data: "https://aka.ms/teamsfx-send-notification",
    buttons: [
      {
        iconPath: "file-symlink-file",
        tooltip: getLocalizedString("core.option.github"),
        command: "fx-extension.openTutorial",
      },
    ],
  };
}

export function CommandAndResponseOptionItem(): OptionItem {
  return {
    // id must match cli `yargsHelp`
    id: "command-bot",
    label: `$(hubot) ${getLocalizedString("core.CommandAndResponseOption.label")}`,
    description: getLocalizedString("core.Option.recommend"),
    cliName: "command-bot",
    detail: getLocalizedString("core.CommandAndResponseOption.detail"),
    groupName: getLocalizedString("core.options.separator.scenario"),
    data: "https://aka.ms/teamsfx-create-command",
    buttons: [
      {
        iconPath: "file-symlink-file",
        tooltip: getLocalizedString("core.option.github"),
        command: "fx-extension.openTutorial",
      },
    ],
  };
}

export function WorkflowOptionItem(): OptionItem {
  return {
    // id must match cli `yargsHelp`
    id: "workflow-bot",
    label: `$(hubot) ${getLocalizedString("core.WorkflowOption.label")}`,
    description: getLocalizedString("core.Option.recommend"),
    cliName: "workflow-bot",
    detail: getLocalizedString("core.WorkflowOption.detail"),
    groupName: getLocalizedString("core.options.separator.scenario"),
    data: "https://aka.ms/teamsfx-create-workflow",
    buttons: [
      {
        iconPath: "file-symlink-file",
        tooltip: getLocalizedString("core.option.github"),
        command: "fx-extension.openTutorial",
      },
    ],
  };
}

export function ExistingTabOptionItem(): OptionItem {
  return {
    id: "ExistingTab",
    label: `$(browser) ${getLocalizedString("core.ExistingTabOption.label")}`,
    cliName: "existing-tab",
    detail: getLocalizedString("core.ExistingTabOption.detail"),
    groupName: getLocalizedString("core.options.separator.scenario"),
    data: "https://aka.ms/teamsfx-embed-existing-web",
    buttons: [
      {
        iconPath: "tasklist",
        tooltip: getLocalizedString("core.option.tutorial"),
        command: "fx-extension.openTutorial",
      },
    ],
  };
}

export function MessageExtensionItem(): OptionItem {
  return {
    id: "MessagingExtension",
    label: getLocalizedString("core.MessageExtensionOption.label"),
    cliName: "message-extension",
    description: getLocalizedString("core.MessageExtensionOption.description"),
    detail: getLocalizedString("core.MessageExtensionOption.detail"),
  };
}

export function MessageExtensionNewUIItem(): OptionItem {
  return {
    id: "MessagingExtension",
    label: `$(comment-discussion) ${getLocalizedString("core.MessageExtensionOption.labelNew")}`,
    cliName: "message-extension",
    detail: getLocalizedString("core.MessageExtensionOption.detail"),
    groupName: getLocalizedString("core.options.separator.basic"),
  };
}
export function TabSPFxItem(): OptionItem {
  return {
    id: "TabSPFx",
    label: getLocalizedString("core.TabSPFxOption.label"),
    cliName: "tab-spfx",
    description: getLocalizedString("core.TabSPFxOption.description"),
    detail: getLocalizedString("core.TabSPFxOption.detail"),
  };
}

export function TabSPFxNewUIItem(): OptionItem {
  return {
    id: "TabSPFx",
    label: `$(browser) ${getLocalizedString("core.TabSPFxOption.labelNew")}`,
    cliName: "tab-spfx",
    detail: getLocalizedString("core.TabSPFxOption.detailNew"),
    groupName: getLocalizedString("core.options.separator.scenario"),
  };
}

export function TabSsoItem(): OptionItem {
  return {
    id: "TabSSO",
    label: "TabSSO",
    cliName: "tab-sso",
    description: getLocalizedString("core.TabSso.description"),
    detail: getLocalizedString("core.TabSso.detail"),
    groupName: getLocalizedString("core.options.separator.scenario"),
  };
}

export function BotSsoItem(): OptionItem {
  return {
    id: "BotSSO",
    label: "BotSSO",
    cliName: "bot-sso",
    description: getLocalizedString("core.BotSso.description"),
    detail: getLocalizedString("core.BotSso.detail"),
  };
}
export function TabNonSsoItem(): OptionItem {
  return {
    id: "TabNonSso",
    label: `$(browser) ${getLocalizedString("core.TabNonSso.label")}`,
    cliName: "tab-non-sso",
    detail: getLocalizedString("core.TabNonSso.detail"),
    groupName: getLocalizedString("core.options.separator.basic"),
  };
}
export function TabNonSsoAndDefaultBotItem(): OptionItem {
  return {
    id: "TabNonSsoAndBot",
    label: "", // No need to set display name as this option won't be shown in UI
  };
}

export function DefaultBotAndMessageExtensionItem(): OptionItem {
  return {
    id: "BotAndMessageExtension",
    label: "", // No need to set display name as this option won't be shown in UI
  };
}
export function M365SsoLaunchPageOptionItem(): OptionItem {
  return {
    id: "M365SsoLaunchPage",
    label: `$(browser) ${getLocalizedString("core.M365SsoLaunchPageOptionItem.label")}`,
    cliName: "sso-launch-page",
    detail: getLocalizedString("core.M365SsoLaunchPageOptionItem.detail"),
    groupName: getLocalizedString("core.options.separator.m365"),
  };
}
export function M365SearchAppOptionItem(): OptionItem {
  return {
    id: "M365SearchApp",
    label: `$(comment-discussion) ${getLocalizedString("core.M365SearchAppOptionItem.label")}`,
    cliName: "search-app",
    detail: getLocalizedString("core.M365SearchAppOptionItem.detail"),
    groupName: getLocalizedString("core.options.separator.m365"),
  };
}

export enum AzureSolutionQuestionNames {
  Capabilities = "capabilities",
  TabScopes = "tab-scopes",
  HostType = "host-type",
  AzureResources = "azure-resources",
  PluginSelectionDeploy = "deploy-plugin",
  AddResources = "add-azure-resources",
  AppName = "app-name",
  AskSub = "subscription",
  ProgrammingLanguage = "programming-language",
  Solution = "solution",
  Scenarios = "scenarios",
  Features = "features",
}

export enum SPFxQuestionNames {
  SPFxFolder = "spfx-folder",
  WebPartName = "spfx-webpart-name",
  ManifestPath = "manifest-path",
  LocalManifestPath = "local-manifest-path",
}

export function HostTypeOptionAzure(): OptionItem {
  return {
    id: "Azure",
    label: getLocalizedString("core.HostTypeOptionAzure.label"),
    cliName: "azure",
  };
}

export function HostTypeOptionSPFx(): OptionItem {
  return {
    id: "SPFx",
    label: getLocalizedString("core.HostTypeOptionSPFx.label"),
    cliName: "spfx",
  };
}
export const AzureResourceSQL: OptionItem = {
  id: "sql",
  label: getLocalizedString("core.AzureResourceSQL.label"),
  description: getLocalizedString("core.AzureResourceSQL.description"),
};

export const AzureResourceSQLNewUI: OptionItem = {
  id: "sql",
  label: `$(azure) ${getLocalizedString("core.AzureResourceSQLNewUI.label")}`,
  detail: getLocalizedString("core.AzureResourceSQLNewUI.detail"),
  groupName: getLocalizedString("core.options.separator.resource"),
};

export const AzureResourceFunction: OptionItem = {
  id: "function",
  label: getLocalizedString("core.AzureResourceFunction.label"),
};

export const AzureResourceFunctionNewUI: OptionItem = {
  id: "function",
  label: `$(azure) ${getLocalizedString("core.AzureResourceFunctionNewUI.label")}`,
  detail: getLocalizedString("core.AzureResourceFunctionNewUI.detail"),
  groupName: getLocalizedString("core.options.separator.resource"),
};

export const AzureResourceApim: OptionItem = {
  id: "apim",
  label: getLocalizedString("core.AzureResourceApim.label"),
  description: getLocalizedString("core.AzureResourceApim.description"),
};

export const AzureResourceApimNewUI: OptionItem = {
  id: "apim",
  label: `$(azure) ${getLocalizedString("core.AzureResourceApimNewUI.label")}`,
  detail: getLocalizedString("core.AzureResourceApimNewUI.detail"),
  groupName: getLocalizedString("core.options.separator.resource"),
};

export const AzureResourceKeyVault: OptionItem = {
  id: "keyvault",
  label: getLocalizedString("core.AzureResourceKeyVault.label"),
  description: getLocalizedString("core.AzureResourceKeyVault.description"),
};

export const AzureResourceKeyVaultNewUI: OptionItem = {
  id: "keyvault",
  label: `$(azure) ${getLocalizedString("core.AzureResourceKeyVaultNewUI.label")}`,
  detail: getLocalizedString("core.AzureResourceKeyVaultNewUI.detail"),
  groupName: getLocalizedString("core.options.separator.resource"),
};

export const SingleSignOnOptionItem: OptionItem = {
  id: "sso",
  label: `$(unlock) ${getLocalizedString("core.SingleSignOnOption.label")}`,
  detail: getLocalizedString("core.SingleSignOnOption.detail"),
  groupName: getLocalizedString("core.options.separator.additional"),
  data: "https://aka.ms/teamsfx-add-sso",
  buttons: [
    {
      iconPath: "tasklist",
      tooltip: getLocalizedString("core.option.tutorial"),
      command: "fx-extension.openTutorial",
    },
  ],
};

export const ApiConnectionOptionItem: OptionItem = {
  id: "api-connection",
  label: `$(arrow-swap) ${getLocalizedString("core.ApiConnectionOption.label")}`,
  detail: getLocalizedString("core.ApiConnectionOption.detail"),
  groupName: getLocalizedString("core.options.separator.additional"),
  data: "https://aka.ms/teamsfx-connect-api",
  buttons: [
    {
      iconPath: "tasklist",
      tooltip: getLocalizedString("core.option.tutorial"),
      command: "fx-extension.openTutorial",
    },
  ],
};

export const CicdOptionItem: OptionItem = {
  id: "cicd",
  label: `$(sync) ${getLocalizedString("core.cicdWorkflowOption.label")}`,
  detail: getLocalizedString("core.cicdWorkflowOption.detail"),
  groupName: getLocalizedString("core.options.separator.additional"),
  data: "https://aka.ms/teamsfx-add-cicd",
  buttons: [
    {
      iconPath: "tasklist",
      tooltip: getLocalizedString("core.option.tutorial"),
      command: "fx-extension.openTutorial",
    },
  ],
};

export enum BotScenario {
  NotificationBot = "notificationBot",
  CommandAndResponseBot = "commandAndResponseBot",
  WorkflowBot = "workflowBot",
}

export const BotNotificationTriggers = {
  Timer: "timer",
  Http: "http",
} as const;

export type BotNotificationTrigger =
  typeof BotNotificationTriggers[keyof typeof BotNotificationTriggers];

export const AzureResourcesQuestion: MultiSelectQuestion = {
  name: AzureSolutionQuestionNames.AzureResources,
  title: getLocalizedString("core.question.AzureResourcesQuestion.title"),
  type: "multiSelect",
  staticOptions: [AzureResourceSQL, AzureResourceFunction],
  default: [],
  onDidChangeSelection: async function (
    currentSelectedIds: Set<string>,
    previousSelectedIds: Set<string>
  ): Promise<Set<string>> {
    if (currentSelectedIds.has(AzureResourceSQL.id)) {
      currentSelectedIds.add(AzureResourceFunction.id);
    }
    return currentSelectedIds;
  },
  placeholder: getLocalizedString("core.question.AzureResourcesQuestion.placeholder"),
};

export const BotFeatureIds = () => [
  BotOptionItem().id,
  NotificationOptionItem().id,
  CommandAndResponseOptionItem().id,
  WorkflowOptionItem().id,
  MessageExtensionItem().id,
  M365SearchAppOptionItem().id,
];

export const TabFeatureIds = () => [
  TabOptionItem().id,
  TabNonSsoItem().id,
  M365SsoLaunchPageOptionItem().id,
  DashboardOptionItem().id,
];

export const AadConstants = {
  DefaultTemplateFileName: "aad.manifest.json",
};
