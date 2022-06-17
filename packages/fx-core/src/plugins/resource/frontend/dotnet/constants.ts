// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";

export class Constants {
  static readonly emptyString = "";
}

export class AzureInfo {
  static readonly zipDeployURL = (appName: string) =>
    `https://${appName}.scm.azurewebsites.net/api/zipdeploy`;
}

export class RegularExpr {
  static readonly targetFramework: RegExp = /(?<=<TargetFramework>)(.*)(?=<)/gim;
  static readonly clientId = /\$clientId\$/g;
  static readonly clientSecret = /\$client-secret\$/g;
  static readonly oauthAuthority = /\$oauthAuthority\$/g;
}

export class DotnetPluginInfo {
  // TODO: Migrate DotNet plugin to frontend plugin
  static readonly pluginName = "fx-resource-frontend-hosting";
  static readonly issueLink = "https://github.com/OfficeDev/TeamsFx/issues/new";
  static readonly helpLink = "https://aka.ms/teamsfx-bz-help";

  static readonly defaultFramework = "net6.0";
  static readonly defaultRuntime = "win-x86";
}

export class DotnetPathInfo {
  static readonly publishFolderPath = (
    workingPath: string,
    framework = DotnetPluginInfo.defaultFramework,
    runtime = DotnetPluginInfo.defaultRuntime
  ): string => path.join(workingPath, "bin", "Release", framework, runtime, "publish");

  static readonly bicepTemplateFolder = (templateFolder: string) =>
    path.join(templateFolder, "plugins", "resource", "webapp", "bicep");
  static readonly projectFilename = (projectName: string): string => `${projectName}.csproj`;

  static readonly indexPath = ""; // Index path is '/', relative path is empty.
  static readonly appSettingDevelopment = "appsettings.Development.json";
  static readonly oauthHost = (tenantId: string): string =>
    `https://login.microsoftonline.com/${tenantId}`;
}

export class DotnetCommands {
  static readonly buildRelease = (runtime: string) =>
    `dotnet publish --configuration Release --runtime ${runtime} --self-contained`;
}

export class DependentPluginInfo {
  static readonly solutionPluginName = "solution";
  static readonly subscriptionId = "subscriptionId";
  static readonly resourceGroupName = "resourceGroupName";

  public static readonly aadClientId: string = "clientId";
  public static readonly aadClientSecret: string = "clientSecret";
  public static readonly appTenantId: string = "teamsAppTenantId";
}

export class DotnetConfigInfo {
  static readonly webAppName = "webAppName";
  static readonly appServicePlanName = "appServicePlanName";
  static readonly webAppEndpoint = "endpoint";
  static readonly webAppDomain = "domain";
  static readonly projectFilePath = "projectFilePath";
  static readonly indexPath = "indexPath";
}

export class WebappBicepFile {
  static readonly configurationTemplateFileName = "webappConfiguration.template.bicep";
  static readonly provisionTemplateFileName = "webappProvision.template.bicep";
}

export class WebappBicep {
  static readonly endpoint = "provisionOutputs.webappOutput.value.endpoint";
  static readonly resourceId = "provisionOutputs.webappOutput.value.resourceId";
  static readonly domain = "provisionOutputs.webappOutput.value.domain";
  static readonly endpointAsParam = "webappProvision.outputs.endpoint";
  static readonly domainAsParam = "webappProvision.outputs.domain";

  static readonly Reference = {
    webappResourceId: WebappBicep.resourceId,
    endpoint: WebappBicep.endpoint,
    domain: WebappBicep.domain,
    endpointAsParam: WebappBicep.endpointAsParam,
    domainAsParam: WebappBicep.domainAsParam,
  };
}

export class AppSettingsPlaceholders {
  static readonly clientId = "$clientId$";
  static readonly clientSecret = "$client-secret$";
  static readonly oauthAuthority = "$oauthAuthority$";
}
