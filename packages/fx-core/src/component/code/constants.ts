// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export class Commands {
  static readonly NpmInstall = "npm install";
  static readonly NpmInstallProd = "npm install --only=prod";
  static readonly NpmBuild = "npm run build";
  static readonly DotNetPublish = "dotnet publish --configuration Release";
  static readonly BlazorBuild = (output: string, runtime: string): string =>
    `dotnet publish --output ${output} --configuration Release --runtime ${runtime} --self-contained`;
  static readonly NpmRunScript = (script: string): string => `npm run ${script}`;
}

export const NpmScripts = {
  customizedBuild: "build:teamsfx",
  customizedInstall: "install:teamsfx",
};

export const DEFAULT_DOTNET_FRAMEWORK = "net6.0";

export const TemplateGroup = {
  bot: "bot",
  tab: "tab",
  apiBase: "function-base",
  apiTriggers: "function-triggers",
};

export const ApiConstants = {
  functionTriggerType: "HTTPTrigger",
  baseScenarioName: "default",
};

export const TemplatePlaceHolders = {
  functionEntry: /entryname/g,
  ProjectFile: /ProjectName/g,
};

export const RemoteTeamsAppId = "remoteTeamsAppId";

export const TelemetryComponent = {
  api: "fx-resource-function",
};
