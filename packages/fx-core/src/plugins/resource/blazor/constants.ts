// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";

export class Constants {
  static readonly emptyString = "";
}

export class AzureInfo {
  static readonly webappNameLenMax = 24;
  static readonly suffixLenMax = 12;
  static readonly zipDeployURL = (appName: string) =>
    `https://${appName}.scm.azurewebsites.net/api/zipdeploy`;
  static readonly requiredResourceProviders = ["Microsoft.Web"];
  static readonly aadMetadataAddress = (tenantId: string) =>
    `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`;
}

export class RegularExpr {
  static readonly allCharToBeSkippedInName: RegExp = /[^a-zA-Z0-9]/g;
}

export class DefaultProvisionConfigs {
  static readonly appServicePlansConfig = (location: string) => ({
    location: location,
    kind: "app",
    sku: {
      name: "B1",
    },
  });

  static readonly webAppConfig = (location: string) => ({
    kind: "app",
    location: location,
    sku: {
      name: "B1",
    },
  });
}

export class BlazorPluginInfo {
  static readonly pluginName = "fx-resource-blazor";
  static readonly displayName = "Blazor";
  static readonly alias = "bz";
  static readonly issueLink = "https://github.com/OfficeDev/TeamsFx/issues/new";
  static readonly helpLink = "https://aka.ms/teamsfx-bz-help";

  static readonly persistentConfig = ["webAppName", "appServicePlanName", "webAppEndpoint"];

  static readonly defaultFramework = "net5.0";
  static readonly defaultRuntime = "win-x86";
}

export class BlazorPathInfo {
  static readonly publishFolderPath = (
    workingPath: string,
    framework = BlazorPluginInfo.defaultFramework,
    runtime = BlazorPluginInfo.defaultRuntime
  ) => path.join(workingPath, "bin", "Release", framework, runtime, "publish");
}

export class BlazorCommands {
  static readonly buildRelease = (runtime: string) =>
    `dotnet publish --configuration Release --runtime ${runtime} --self-contained`;
}

export class DependentPluginInfo {
  static readonly solutionPluginName = "solution";
  static readonly subscriptionId = "subscriptionId";
  static readonly resourceGroupName = "resourceGroupName";
  static readonly resourceNameSuffix = "resourceNameSuffix";
  static readonly location = "location";
  static readonly remoteTeamsAppId = "remoteTeamsAppId";

  static readonly functionPluginName = "fx-resource-function";
  static readonly functionEndpoint = "functionEndpoint";

  static readonly runtimePluginName = "fx-resource-simple-auth";
  static readonly runtimeEndpoint = "endpoint";
  static readonly startLoginPageURL = "auth-start.html";

  static readonly aadPluginName = "fx-resource-aad-app-for-teams";
  static readonly clientID = "clientId";
  static readonly tenantId = "tenantId";
  static readonly aadClientSecret = "clientSecret";
  static readonly oauthHost = "oauthHost";
  static readonly applicationIdUris = "applicationIdUris";

  static readonly botPluginName = "fx-resource-bot";
  static readonly botId = "botId";
  static readonly botPassword = "botPassword";
}

export class BlazorConfigInfo {
  static readonly webAppName = "webAppName";
  static readonly appServicePlanName = "appServicePlanName";
  static readonly webAppEndpoint = "webAppEndpoint";
  static readonly webAppId = "webAppId";
}
