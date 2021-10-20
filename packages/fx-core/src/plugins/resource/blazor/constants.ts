// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Kind, SkuName, SkuTier } from "@azure/arm-storage/esm/models";
import { TeamsClientId } from "../../../common/constants";

export class Constants {
  static emptyString = "";

  static dayInMS = 1000 * 60 * 60 * 24;
}

export class AzureInfo {
  public static readonly resourceNameLenMax: number = 24;
  public static readonly suffixLenMax: number = 12;
  public static readonly zipDeployURL = (functionAppName: string) =>
    `https://${functionAppName}.scm.azurewebsites.net/api/zipdeploy`;
  public static readonly runFromPackageSettingKey = "WEBSITE_RUN_FROM_PACKAGE";
  public static readonly runFromPackageEnabled = "1";
  public static readonly requiredResourceProviders = ["Microsoft.Web", "Microsoft.Storage"];
}

export class RegularExpr {
  public static readonly validFunctionNamePattern: RegExp = /^[a-zA-Z][\w-]{0,126}$/;
  // See https://docs.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules.
  public static readonly validAppServicePlanNamePattern: RegExp = /^[a-zA-Z0-9\-]{1,40}$/;
  public static readonly validFunctionAppNamePattern: RegExp =
    /^[a-zA-Z0-9][a-zA-Z0-9\-]{0,58}[a-zA-Z0-9]$/;
  public static readonly validStorageAccountNamePattern: RegExp = /^[a-z0-9]{3,24}$/;
  public static readonly validResourceSuffixPattern: RegExp = /[0-9a-z]{1,16}/;
  public static readonly allCharToBeSkippedInName: RegExp = /[^a-zA-Z0-9]/g;
  public static readonly replaceTemplateExtName: RegExp = /\.tpl$/;
  public static readonly replaceTemplateFileNamePlaceholder: RegExp = /entryname/g;
}

export class DefaultProvisionConfigs {
  public static readonly allowAppIdSep = ";";
  public static readonly nameSuffix = "be";
  public static readonly siteIdentityTypeUserAssigned = "UserAssigned";

  public static readonly appServicePlansConfig = (location: string) => ({
    location: location,
    kind: "app",
    sku: {
      name: "B1",
    },
  });

  public static readonly webAppStaticSettings: { [key: string]: string } = {
    ALLOWED_APP_IDS: [TeamsClientId.MobileDesktop, TeamsClientId.Web].join(";"),
    WEBSITE_RUN_FROM_PACKAGE: "1",
  };

  public static readonly webAppConfig = (location: string) => ({
    kind: "app",
    location: location,
    sku: {
      name: "B1",
    },
  });
}
export class BlazorPluginInfo {
  static PluginName = "fx-resource-blazor";
  static DisplayName = "Blazor";
  static ShortName = "bz";
  static IssueLink = "https://github.com/OfficeDev/TeamsFx/issues/new";
  static HelpLink = "https://aka.ms/teamsfx-bz-help";

  static readonly PersistentConfig: string[] = [
    "webAppName",
    "appServicePlanName",
    "webAppEndpoint",
  ];
}

export class Commands {}

export class DependentPluginInfo {
  static readonly SolutionPluginName = "solution";
  static readonly SubscriptionId = "subscriptionId";
  static readonly ResourceGroupName = "resourceGroupName";
  static readonly ResourceNameSuffix = "resourceNameSuffix";
  static readonly Location = "location";
  static readonly ProgrammingLanguage = "programmingLanguage";
  static readonly RemoteTeamsAppId = "remoteTeamsAppId";

  static readonly FunctionPluginName = "fx-resource-function";
  static readonly FunctionEndpoint = "functionEndpoint";

  static readonly RuntimePluginName = "fx-resource-simple-auth";
  static readonly RuntimeEndpoint = "endpoint";
  static readonly StartLoginPageURL = "auth-start.html";

  static readonly AADPluginName = "fx-resource-aad-app-for-teams";
  static readonly ClientID = "clientId";
  public static readonly tenantId: string = "tenantId";
  public static readonly aadClientSecret: string = "clientSecret";
  public static readonly oauthHost: string = "oauthHost";
  public static readonly applicationIdUris: string = "applicationIdUris";

  static readonly BotPluginName = "fx-resource-bot";
  public static readonly botId = "botId";
  public static readonly botPassword = "botPassword";
}

export class BlazorConfigInfo {}

export class AppSettingsKey {
  static readonly clientSecret = "CLIENT_SECRET";
  static readonly clientId = "CLIENT_ID";
  static readonly oauthHost = "OAUTH_AUTHORITY";
  static readonly tabAppEndpoint = "TAB_APP_ENDPOINT";
  static readonly aadMetadataAddress = "AAD_METADATA_ADDRESS";
  static readonly botId = "BOT_ID";
  static readonly botPassword = "BOT_PASSWORD";
  static readonly identifierUri = "IDENTIFIER_URI";
}
