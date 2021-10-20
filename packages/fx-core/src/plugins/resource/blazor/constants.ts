// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";

export class Constants {
  static EmptyString = "";

  static DayInMS = 1000 * 60 * 60 * 24;
}

export class FrontendPluginInfo {
  static PluginName = "fx-resource-blazor";
  static DisplayName = "Blazor";
  static ShortName = "BZ";
  static IssueLink = "https://github.com/OfficeDev/TeamsFx/issues/new";
  static HelpLink = "https://aka.ms/teamsfx-bz-help";
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

  static readonly LocalDebugPluginName = "fx-resource-local-debug";
  static readonly LocalTabEndpoint = "localTabEndpoint";
}

export class BlazorConfigInfo {}
