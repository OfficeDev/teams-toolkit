// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export const CONFIGURATION_PREFIX = "fx-extension";
export enum ConfigurationKey {
  BicepEnvCheckerEnable = "prerequisiteCheck.bicep",
  CopilotPluginEnable = "developCopilotPlugin",
  LogLevel = "logLevel",
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
  SampleGalleryLayout = "teamsToolkit:sampleGallery:layout",
  AutoInstallDependency = "teamsToolkit:autoInstallDependency",
}

export enum CommandKey {
  Create = "fx-extension.create",
  OpenWelcome = "fx-extension.openWelcome",
  OpenDocument = "fx-extension.openDocument",
  OpenSamples = "fx-extension.openSamples",
  ValidateGetStartedPrerequisites = "fx-extension.validate-getStarted-prerequisites",
  OpenReadMe = "fx-extension.openReadMe",
  DebugInTestToolFromMessage = "fx-extension.debugInTestToolFromMessage",
  SigninM365 = "fx-extension.signinM365",
  LocalDebug = "fx-extension.localdebug",
  SigninAzure = "fx-extension.signinAzure",
  Provision = "fx-extension.provision",
  Deploy = "fx-extension.deploy",
  Publish = "fx-extension.publish",
  Preview = "fx-extension.preview",
}

export const environmentVariableRegex = /\${{[a-zA-Z-_]+}}/g;

export const PublishAppLearnMoreLink =
  "https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/apps-publish-overview";

export const DeveloperPortalHomeLink = "https://dev.teams.microsoft.com/home";

export const TerminalName = "Teams Toolkit";

export const InstallCopilotChatLink = "https://aka.ms/install-github-copilot-chat";
