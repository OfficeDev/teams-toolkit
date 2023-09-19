// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * @author Huajie Zhang <huajiezhang@microsoft.com>
 */
import { OptionItem } from "@microsoft/teamsfx-api";
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
  APIM: "apim",
  KeyVault: "key-vault",
  AzureSQL: "azure-sql",
  TabCode: "tab-code",
  BotCode: "bot-code",
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
    errorStack: "error-stack",
    timeCost: "time-cost",
    errorName: "error-name", // need classify, keep error name as a separate property for telemetry analysis, error name should has limited set of values
    innerError: "inner-error", // need classify, JSON serialized raw inner error that is caused by internal error or external call error
    errorCat1: "error-cat1", // need classify, error category level 1
    errorCat2: "error-cat2", // need classify, error category level 2
    errorCat3: "error-cat3", // need classify, error category level 3
    errorStage: "error-stage", // need classify
    errorComponent: "error-component", // need classify
    errorMethod: "error-method", // need classify
    errorSource: "error-source", // need classify
    errorInnerCode: "error-inner-code", // need classify
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

export const PathConstants = {
  botWorkingDir: "bot",
  apiWorkingDir: "api",
  tabWorkingDir: "tabs",
  dotnetWorkingDir: ".",
  npmPackageFolder: "node_modules",
  nodePackageFile: "package.json",
  deploymentInfoFolder: ".deployment",
  deploymentInfoFile: "deployment.json",
  nodeArtifactFolder: "build",
  dotnetArtifactFolder: "publish",
  reactTabIndexPath: "/index.html#",
  blazorTabIndexPath: "/",
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
export const ARM_TEMPLATE_OUTPUT = "armTemplateOutput";
/**
 * Config key whose value is output of ARM templates deployment.
 */
export const TEAMS_FX_RESOURCE_ID_KEY = "teamsFxPluginId";

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
  MissingPermissionsJson = "MissingPermissionsJson",
  NoAppStudioToken = "NoAppStudioToken",
  NoUserName = "NoUserName",
  SubscriptionNotFound = "SubscriptionNotFound",
  CannotLocalDebugInDifferentTenant = "CannotLocalDebugInDifferentTenant",
  NoSubscriptionSelected = "NoSubscriptionSelected",
  InvalidInput = "InvalidInput",
  FailedToRetrieveUserInfo = "FailedToRetrieveUserInfo",
  CannotFindUserInCurrentTenant = "CannotFindUserInCurrentTenant",
  EmailCannotBeEmptyOrSame = "EmailCannotBeEmptyOrSame",
  TeamsAppTenantIdNotRight = "TeamsAppTenantIdNotRight",
  AddSsoNotSupported = "AddSsoNotSupported",
  SsoEnabled = "SsoEnabled",
  InvalidProjectPath = "InvalidProjectPath",
  FailedToCreateAuthFiles = "FailedToCreateAuthFiles",
  FailedToLoadDotEnvFile = "FailedToLoadDotEnvFile",
  InvalidManifestError = "InvalidManifestError",
  FailedToLoadManifestFile = "FailedToLoadManifestFile",
}

export const REMOTE_AAD_ID = "clientId";
export const REMOTE_TEAMS_APP_TENANT_ID = "teamsAppTenantId";

export const AzureRoleAssignmentsHelpLink =
  "https://aka.ms/teamsfx-azure-role-assignments-help-link";
export const SharePointManageSiteAdminHelpLink =
  "https://aka.ms/teamsfx-sharepoint-manage-site-admin-help-link";
export const ViewAadAppHelpLinkV5 = "https://aka.ms/teamsfx-view-aad-app-v5";
export const ViewAadAppHelpLink = "https://aka.ms/teamsfx-view-aad-app";

// This is the max length specified in
// https://developer.microsoft.com/en-us/json-schemas/teams/v1.7/MicrosoftTeams.schema.json

export enum SolutionTelemetryEvent {
  ArmDeploymentStart = "deploy-armtemplate-start",
  ArmDeployment = "deploy-armtemplate",
  AddSsoStart = "add-sso-start",
  AddSso = "add-sso",
}

export enum SolutionTelemetryProperty {
  Component = "component",
  Success = "success",
  CollaboratorCount = "collaborator-count",
  AadOwnerCount = "aad-owner-count",
  AadPermission = "aad-permission",
  ArmDeploymentError = "arm-deployment-error",
  TeamsAppPermission = "teams-app-permission",
  Env = "env",
  SubscriptionId = "subscription-id",
  M365TenantId = "m365-tenant-id",
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

export const AadConstants = {
  DefaultTemplateFileName: "aad.manifest.json",
};

export const validateSchemaOption: OptionItem = {
  id: "validateAgainstSchema",
  label: getLocalizedString("core.selectValidateMethodQuestion.validate.schemaOption"),
  description: getLocalizedString(
    "core.selectValidateMethodQuestion.validate.schemaOptionDescription"
  ),
};

export const validateAppPackageOption: OptionItem = {
  id: "validateAgainstPackage",
  label: getLocalizedString("core.selectValidateMethodQuestion.validate.appPackageOption"),
  description: getLocalizedString(
    "core.selectValidateMethodQuestion.validate.appPackageOptionDescription"
  ),
};
