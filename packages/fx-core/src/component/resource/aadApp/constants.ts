// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";
import { getLocalizedString } from "../../../common/localizeUtils";
import { RequiredResourceAccess } from "./interfaces/IAADDefinition";

export class Constants {
  static oauthAuthorityPrefix = "https://login.microsoftonline.com";
  static aadAppMaxLength = 120;
  static aadAppPasswordDisplayName = "default";

  static INCLUDE_AAD_MANIFEST = "include-aad-manifest";
  static AAD_MANIFEST_FILE = "aad-manifest-file";

  static localDebugPrefix = "local_";

  static AskForEnv = "Which Azure AD app do you want to update permission for?";
  static AskForEnvName = "aad-env";

  static maxRetryTimes = 10;
  static statusCodeUserError = 400;
  static statusCodeServerError = 500;
  static statusCodeForbidden = 403;

  static permissions = {
    name: "Azure AD App",
    owner: "Owner",
    noPermission: "No Permission",
    type: "M365",
  };

  static appPackageFolder = "templates/appPackage";
  static aadManifestTemplateFolder = "plugins/resource/aad/manifest";
  static aadManifestTemplateName = "aad.template.json";

  static createOwnerDuplicatedMessage =
    "One or more added object references already exist for the following modified properties: 'owners'.";

  static defaultPermissions: RequiredResourceAccess = {
    resourceAppId: "00000003-0000-0000-c000-000000000000",
    resourceAccess: [
      {
        // permission: email
        id: "64a6cdd6-aab1-4aaf-94b8-3cc8405e90d0",
        type: "Scope",
      },
      {
        // permission: offline_access
        id: "7427e0e9-2fba-42fe-b0c0-848c9e6a8182",
        type: "Scope",
      },
      {
        // permission: openid
        id: "37f7f235-527c-4136-accd-4a02d197296e",
        type: "Scope",
      },
      {
        // permission: profile
        id: "14dad69e-099b-42c9-810b-d002981feec1",
        type: "Scope",
      },
      {
        // permission: User.Read
        id: "e1fe6dd8-ba31-4d61-89e7-88639da4683d",
        type: "Scope",
      },
    ],
  };
}

export class Telemetry {
  static component = "component";
  static errorCode = "error-code";
  static errorType = "error-type";
  static errorMessage = "error-message";
  static userError = "user";
  static systemError = "system";
  static isSuccess = "success";
  static yes = "yes";
  static no = "no";
  static retryTimes = "retry-times";
  static methodName = "method-name";
  static appId = "appid";
  static skip = "skip";
  static signInAudience = "sign-in-audience";
}

export class Plugins {
  static pluginName = "AAD App Registration";
  static pluginNameComplex = "fx-resource-aad-app-for-teams";
  static pluginNameShort = "aad";
  static frontendHosting = "fx-resource-frontend-hosting";
  static teamsBot = "fx-resource-bot";
  static localDebug = "fx-resource-local-debug";
  static solution = "solution";
  static auth = "auth";
}

export class ConfigKeys {
  static applicationIdUri = "applicationIdUris";
  static clientId = "clientId";
  static clientSecret = "clientSecret";
  static objectId = "objectId";
  static oauth2PermissionScopeId = "oauth2PermissionScopeId";
  static frontendEndpoint = "frontendEndpoint";
  static botId = "botId";
  static botEndpoint = "botEndpoint";
  static teamsMobileDesktopAppId = "teamsMobileDesktopAppId";
  static teamsWebAppId = "teamsWebAppId";
  static domain = "domain";
  static endpoint = "endpoint";
  static oauthAuthority = "oauthAuthority";
  static oauthHost = "oauthHost";
  static tenantId = "tenantId";
  static skip = "skipProvision";
  static accessAsUserScopeId = "accessAsUserScopeId";
}

export class ConfigKeysOfOtherPlugin {
  static frontendHostingDomain = "domain";
  static frontendHostingEndpoint = "endpoint";
  static teamsBotId = "botId";
  static teamsBotIdLocal = "localBotId";
  static teamsBotEndpoint = "siteEndpoint";
  static localDebugTabDomain = "localTabDomain";
  static localDebugTabEndpoint = "localTabEndpoint";
  static localDebugBotEndpoint = "localBotEndpoint";
  static solutionPermissionRequest = "permissionRequest";
  static remoteTeamsAppId = "remoteTeamsAppId";
  static solutionUserInfo = "userInfo";
}

export interface Messages {
  log: string;
  telemetry: string;
}

export class Messages {
  public static readonly getLog = (log: string) => `[${Plugins.pluginName}] ${log}`;
  private static readonly getEventName = (eventName: string) => `${eventName}`;

  static readonly StartProvision: Messages = {
    log: Messages.getLog("Start to provision"),
    telemetry: Messages.getEventName("provision-start"),
  };

  static readonly EndProvision: Messages = {
    log: Messages.getLog("Successfully provision"),
    telemetry: Messages.getEventName("provision"),
  };

  static readonly StartLocalDebug: Messages = {
    log: Messages.getLog("Start to debug"),
    telemetry: Messages.getEventName("local-debug-start"),
  };

  static readonly EndLocalDebug: Messages = {
    log: Messages.getLog("Successfully debug"),
    telemetry: Messages.getEventName("local-debug"),
  };

  static readonly StartPostProvision: Messages = {
    log: Messages.getLog("Start to post-provision"),
    telemetry: Messages.getEventName("post-provision-start"),
  };

  static readonly EndPostProvision: Messages = {
    log: Messages.getLog("Successfully post-provision"),
    telemetry: Messages.getEventName("post-provision"),
  };

  static readonly StartDeploy: Messages = {
    log: Messages.getLog("Start to deploy resources"),
    telemetry: Messages.getEventName("deploy-start"),
  };

  static readonly EndDeploy: Messages = {
    log: Messages.getLog("Successfully deploy resources"),
    telemetry: Messages.getEventName("deploy"),
  };

  static readonly StartBuildAadManifest: Messages = {
    log: Messages.getLog("Start to build aad manifest"),
    telemetry: Messages.getEventName("build-aad-manifest-start"),
  };

  static readonly EndBuildAadManifest: Messages = {
    log: Messages.getLog("Successfully build aad manifest"),
    telemetry: Messages.getEventName("build-aad-manifest"),
  };

  static readonly StartScaffold: Messages = {
    log: Messages.getLog("Start to scaffold resources"),
    telemetry: Messages.getEventName("scaffold-start"),
  };

  static readonly EndScaffold: Messages = {
    log: Messages.getLog("Successfully scaffold resources"),
    telemetry: Messages.getEventName("scaffold"),
  };

  static readonly StartGenerateArmTemplates: Messages = {
    log: Messages.getLog("Start to generate arm templates"),
    telemetry: Messages.getEventName("generate-arm-templates-start"),
  };

  static readonly EndGenerateArmTemplates: Messages = {
    log: Messages.getLog("Successfully generated arm templates"),
    telemetry: Messages.getEventName("generate-arm-templates"),
  };

  static readonly StartPostLocalDebug: Messages = {
    log: Messages.getLog("Start to post debug"),
    telemetry: Messages.getEventName("post-local-debug-start"),
  };

  static readonly EndPostLocalDebug: Messages = {
    log: Messages.getLog("Successfully post debug"),
    telemetry: Messages.getEventName("post-local-debug"),
  };

  static readonly StartUpdatePermission: Messages = {
    log: Messages.getLog("Start to update permission"),
    telemetry: Messages.getEventName("update-permission-start"),
  };

  static readonly EndUpdatePermission: Messages = {
    log: Messages.getLog("Successfully update permission"),
    telemetry: Messages.getEventName("update-permission"),
  };

  static readonly StartCheckPermission: Messages = {
    log: Messages.getLog("Start to check permission"),
    telemetry: Messages.getEventName("check-permission-start"),
  };

  static readonly EndCheckPermission: Messages = {
    log: Messages.getLog("Successfully check permission"),
    telemetry: Messages.getEventName("check-permission"),
  };

  static readonly StartGrantPermission: Messages = {
    log: Messages.getLog("Start to grant permission"),
    telemetry: Messages.getEventName("grant-permission-start"),
  };

  static readonly EndGrantPermission: Messages = {
    log: Messages.getLog("Successfully grant permission"),
    telemetry: Messages.getEventName("grant-permission"),
  };

  static readonly StartListCollaborator: Messages = {
    log: Messages.getLog("Start to list collaborator"),
    telemetry: Messages.getEventName("list-collaborator-start"),
  };

  static readonly EndListCollaborator: Messages = {
    log: Messages.getLog("Successfully list collaborator"),
    telemetry: Messages.getEventName("list-collaborator"),
  };

  static readonly GetAadAppSuccess = "Successfully get Azure AD app.";
  static readonly CreateAadAppSuccess = "Successfully created Azure AD app.";
  static readonly CreateAadAppPasswordSuccess = "Successfully created password for Azure AD app.";
  static readonly UpdatePermissionSuccess = "Successfully updated permission for Azure AD app.";
  static readonly SetAppIdUriSuccess = "Successfully created application id uri for Azure AD app.";
  static readonly UpdateRedirectUriSuccess = "Successfully updated redirect uri for Azure AD app.";
  static readonly UpdateAppIdUriSuccess =
    "Successfully updated application id uri for Azure AD app.";
  static readonly ParsePermissionSuccess = "Successfully parsed permissions.";
  static readonly NoSelection = getLocalizedString("plugins.aad.NoSelection");
  static readonly UserCancelled = getLocalizedString("plugins.aad.UserCancelled");
  static readonly UpdatePermissionSuccessMessage = getLocalizedString(
    "plugins.aad.UpdatePermissionSuccessMessage"
  );
  static readonly SkipProvision = getLocalizedString("plugins.aad.SkipProvision");
  static readonly OwnerAlreadyAdded = (userObjectId: string, objectId: string) =>
    getLocalizedString("plugins.aad.OwnerAlreadyAdded", userObjectId, objectId);
  static readonly StepFailedAndSkipped = (stage: string, helpMessage: string) =>
    getLocalizedString("plugins.aad.StepFailedAndSkipped", stage, helpMessage);
  static readonly UpdatePermissionHelpMessage = getLocalizedString(
    "plugins.aad.UpdatePermissionHelpMessage"
  );
  static readonly UpdateAppIdUriHelpMessage = (appIdUri: string) =>
    getLocalizedString("plugins.aad.UpdateAppIdUriHelpMessage", appIdUri);
  static readonly UpdateRedirectUriHelpMessage = (redirectUri: string) =>
    getLocalizedString("plugins.aad.UpdateRedirectUriHelpMessage", redirectUri);

  static readonly UpdateAadHelpMessage = () =>
    getLocalizedString("plugins.aad.UpdateAadHelpMessage");
}

export class ProgressTitle {
  static readonly Provision = "Provisioning Azure AD app";
  static readonly ProvisionSteps = 3;
  static readonly PostProvision = "Configuring Azure AD app";
  static readonly PostProvisionSteps = 2;
  static readonly UpdatePermission = "Updating permission for Azure AD app";
  static readonly UpdatePermissionSteps = 1;

  static readonly Deploy = "Deploying Azure AD app";
  static readonly DeploySteps = 1;

  static readonly PostProvisionUsingManifest = "Configuring Azure AD app using manifest";
  static readonly PostProvisionUsingManifestSteps = 1;
}

export class ProgressDetail {
  static readonly Starting = "Starting";

  static readonly ProvisionAadApp = "Provision Azure AD app";
  static readonly CreateAadAppSecret = "Create secret for Azure AD app";
  static readonly GetAadApp = "Get Azure AD app";

  static readonly UpdateAadApp = "Update AD app";
  static readonly UpdateRedirectUri = "Update redirect uri for Azure AD app";
  static readonly UpdateAppIdUri = "Update application id uri for Azure AD app";

  static readonly UpdatePermission = "Update permission for Azure AD app";
}

export class TemplatePathInfo {
  static readonly TemplateRelativeDir = path.join("plugins", "resource", "aad");
  static readonly BicepTemplateRelativeDir = path.join(
    TemplatePathInfo.TemplateRelativeDir,
    "bicep"
  );
}

export class ConfigFilePath {
  static readonly Default = "env.default.json";
  static readonly LocalSettings = "localSettings.json";
  static readonly State = (env: string) => `state.${env}.json`;
  static readonly Input = (env: string) => `config.${env}.json`;
}

export class UILevels {
  static readonly Info = "info";
  static readonly Warn = "warn";
  static readonly Error = "error";
}
