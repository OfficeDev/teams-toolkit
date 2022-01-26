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
}

export class DotnetPluginInfo {
  static readonly pluginName = "fx-resource-dotnet";
  static readonly displayName = "Dotnet";
  static readonly alias = "DN";
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
  static readonly TemplateFolderName = "dotnet";
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

export class DotnetSupportCapability {
  static readonly tabCapability = "Tab";
  static readonly botCapability = "Bot";
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
