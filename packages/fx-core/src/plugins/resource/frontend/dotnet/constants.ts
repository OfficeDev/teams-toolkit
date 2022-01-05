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
  // TODO: static readonly requiredResourceProviders = ["Microsoft.Web"];
  static readonly aadMetadataAddress = (tenantId: string) =>
    `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`;
}

export class RegularExpr {
  static readonly allCharToBeSkippedInName: RegExp = /[^a-zA-Z0-9]/g;
  static readonly targetFramework: RegExp = /(?<=<TargetFramework>)(.*)(?=<)/gim;
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

export class DotnetPluginInfo {
  static readonly pluginName = "fx-resource-dotnet";
  static readonly displayName = "Dotnet";
  static readonly alias = "bz";
  static readonly issueLink = "https://github.com/OfficeDev/TeamsFx/issues/new";
  static readonly helpLink = "https://aka.ms/teamsfx-bz-help";

  static readonly persistentConfig = [
    "webAppName",
    "appServicePlanName",
    "endpoint",
    "domain",
    "projectFilePath",
  ];

  static readonly defaultFramework = "net6.0";
  static readonly defaultRuntime = "win-x86";
}

export class DotnetPathInfo {
  static readonly publishFolderPath = (
    workingPath: string,
    framework = DotnetPluginInfo.defaultFramework,
    runtime = DotnetPluginInfo.defaultRuntime
  ): string => path.join(workingPath, "bin", "Release", framework, runtime, "publish");
}

export class DotnetCommands {
  static readonly buildRelease = (runtime: string) =>
    `dotnet publish --configuration Release --runtime ${runtime} --self-contained`;
}

export class DependentPluginInfo {
  static readonly solutionPluginName = "solution";
  static readonly subscriptionId = "subscriptionId";
  static readonly resourceGroupName = "resourceGroupName";
}

export class DotnetConfigInfo {
  static readonly webAppName = "webAppName";
  static readonly appServicePlanName = "appServicePlanName";
  static readonly webAppEndpoint = "endpoint";
  static readonly webAppDomain = "domain";
  static readonly projectFilePath = "projectFilePath";
}
