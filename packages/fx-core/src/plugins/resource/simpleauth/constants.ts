// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export class Constants {
  static readonly SolutionPlugin = {
    id: "solution",
    configKeys: {
      resourceNameSuffix: "resourceNameSuffix",
      subscriptionId: "subscriptionId",
      resourceGroupName: "resourceGroupName",
      location: "location",
      remoteTeamsAppId: "remoteTeamsAppId",
    },
  };

  static readonly AadAppPlugin = {
    id: "fx-resource-aad-app-for-teams",
    configKeys: {
      clientId: "clientId",
      clientSecret: "clientSecret",
      applicationIdUris: "applicationIdUris",
      oauthAuthority: "oauthAuthority",
      teamsMobileDesktopAppId: "teamsMobileDesktopAppId",
      teamsWebAppId: "teamsWebAppId",
    },
  };

  static readonly FrontendPlugin = {
    id: "fx-resource-frontend-hosting",
    configKeys: {
      endpoint: "endpoint",
    },
  };

  static readonly LocalDebugPlugin = {
    id: "fx-resource-local-debug",
    configKeys: {
      endpoint: "localTabEndpoint",
    },
  };

  static readonly SimpleAuthPlugin = {
    id: "fx-resource-simple-auth",
    name: "Simple Auth Plugin",
    shortName: "sa",
    configKeys: {
      endpoint: "endpoint",
      filePath: "filePath",
      environmentVariableParams: "environmentVariableParams",
      skuName: "skuName",
    },
  };

  static readonly SimpleAuthBicepModuleTemplateFileName: string = "simpleAuth.template.bicep";
  static readonly SimpleAuthBicepOrchestrationParameterFileName: string =
    "input_param.template.bicep";
  static readonly SimpleAuthBicepOrchestrationModuleTemplateFileName: string =
    "module.template.bicep";
  static readonly SimpleAuthBicepOrchestrationOutputTemplateFileName: string =
    "output.template.bicep";

  static readonly SimpleAuthBicepOutputSkuName: string = "simpleAuthProvision.outputs.skuName";
  static readonly SimpleAuthBicepOutputEndpoint: string = "simpleAuthProvision.outputs.endpoint";

  static readonly SimpleAuthFileName: string = "SimpleAuth.zip";
  static readonly SimpleAuthZipName = (version: string): string =>
    `Microsoft.TeamsFx.SimpleAuth_${version}.zip`;
  static readonly SimpleAuthTag = (version: string): string => `simpleauth@${version}`;
  static readonly SimpleAuthReleaseUrl = (tagName: string, fileName: string): string =>
    `https://github.com/OfficeDev/TeamsFx/releases/download/${tagName}/${fileName}`;
  static readonly VersionFileName: string = "version.txt";

  static readonly ResourceNameMaxLength = 40;
  static readonly SimpleAuthSuffix = "sa";
  static readonly LocalPrefix = "local_";

  static readonly Component = "component";

  static readonly ApplicationSettingsKeys = {
    clientId: "CLIENT_ID",
    clientSecret: "CLIENT_SECRET",
    oauthAuthority: "OAUTH_AUTHORITY",
    applicationIdUris: "IDENTIFIER_URI",
    allowedAppIds: "ALLOWED_APP_IDS",
    tabAppEndpoint: "TAB_APP_ENDPOINT",
    aadMetadataAddress: "AAD_METADATA_ADDRESS",
  };

  static readonly ProgressBar = {
    start: "Starting",
    provision: {
      title: "Provisioning Simple Auth",
      createAppServicePlan: "Creating Azure App Service plan",
      createWebApp: "Creating Azure Web App",
      zipDeploy: "Deploying Simple Auth",
    },
    postProvision: {
      title: "Configuring Simple Auth",
      updateWebApp: "Updating Azure Web App",
    },
  };

  static readonly FreeServerFarmsQuotaErrorFromAzure =
    "The maximum number of Free ServerFarms allowed in a Subscription is 10";
  static readonly FreeServerFarmsQuotaErrorToUser =
    "The maximum number of Free App Service Plan allowed in a Subscription is 10. Delete a free App Service plan and try again.";
  static readonly MissingSubscriptionRegistrationErrorFromAzure =
    "The subscription is not registered to use namespace 'Microsoft.Web'";
  static readonly HelpLink = "https://aka.ms/teamsfx-sa-help";
}

export class Telemetry {
  static component = "component";
  static errorCode = "error-code";
  static errorType = "error-type";
  static skuName = "sku-name";
  static errorMessage = "error-message";
  static userError = "user";
  static systemError = "system";
  static isSuccess = "success";
  static success = "yes";
  static fail = "no";
  static appId = "appid";
}

export interface Message {
  log: string;
  telemetry: string;
}

export class Messages {
  public static readonly getLog = (log: string) => `[${Constants.SimpleAuthPlugin.name}] ${log}`;
  private static readonly getEventName = (eventName: string) => `${eventName}`;

  static readonly StartLocalDebug: Message = {
    log: Messages.getLog("Starting local-debug"),
    telemetry: Messages.getEventName("local-debug-start"),
  };
  static readonly EndLocalDebug: Message = {
    log: Messages.getLog("Successfully started local-debug"),
    telemetry: Messages.getEventName("local-debug"),
  };
  static readonly StartPostLocalDebug: Message = {
    log: Messages.getLog("Starting post-local-debug"),
    telemetry: Messages.getEventName("post-local-debug-start"),
  };
  static readonly EndPostLocalDebug: Message = {
    log: Messages.getLog("Successfully started post-local-debug"),
    telemetry: Messages.getEventName("post-local-debug"),
  };
  static readonly StartProvision: Message = {
    log: Messages.getLog("Provisioning"),
    telemetry: Messages.getEventName("provision-start"),
  };
  static readonly EndProvision: Message = {
    log: Messages.getLog("Successfully provisioned"),
    telemetry: Messages.getEventName("provision"),
  };
  static readonly StartGenerateArmTemplates: Message = {
    log: Messages.getLog("Starting generating arm templates"),
    telemetry: Messages.getEventName("generate-arm-templates-start"),
  };
  static readonly EndGenerateArmTemplates: Message = {
    log: Messages.getLog("Successfully generated arm templates"),
    telemetry: Messages.getEventName("generate-arm-templates"),
  };
  static readonly StartPostProvision: Message = {
    log: Messages.getLog("Post-provisioning"),
    telemetry: Messages.getEventName("post-provision-start"),
  };
  static readonly EndPostProvision: Message = {
    log: Messages.getLog("Successfully post-provisioned"),
    telemetry: Messages.getEventName("post-provision"),
  };
}
