// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export class Commands {
  static readonly NpmInstall = "npm install";
  static readonly NpmBuild = "npm run build";
  static readonly DotNetPublish = "dotnet publish --configuration Release";
}

export const DEFAULT_DOTNET_FRAMEWORK = "net6.0";

export const TemplateGroup = {
  bot: "bot",
  tab: "tab",
  apiBase: "function-base",
  apiTriggers: "function-triggers",
};
