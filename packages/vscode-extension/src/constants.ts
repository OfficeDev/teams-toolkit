// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export const CONFIGURATION_PREFIX = "fx-extension";
export enum ConfigurationKey {
  BicepEnvCheckerEnable = "prerequisiteCheck.bicep",
  CopilotPluginEnable = "developCopilotPlugin",
}

export const AzurePortalUrl = "https://portal.azure.com";

export enum SyncedState {
  Version = "teamsToolkit:synced:version",
}

export enum UserState {
  IsExisting = "teamsToolkit:user:isExisting",
}

export enum PrereleaseState {
  Version = "teamsToolkit:prerelease:version",
}

export enum GlobalKey {
  OpenWalkThrough = "fx-extension.openWalkThrough",
  OpenReadMe = "fx-extension.openReadMe",
  OpenSampleReadMe = "fx-extension.openSampleReadMe",
  ShowLocalDebugMessage = "ShowLocalDebugMessage",
  CreateWarnings = "CreateWarnings",
}

export const environmentVariableRegex = /\${{[a-zA-Z-_]+}}/g;

export const PublishAppLearnMoreLink =
  "https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/apps-publish-overview";

export const DeveloperPortalHomeLink = "https://dev.teams.microsoft.com/home";

export const TerminalName = "Teams Toolkit";
