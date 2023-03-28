// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export enum Capability {
  Notification = "notification",
  CommandBot = "command-bot",
  WorkflowBot = "workflow-bot",
  DashBoardTab = "dashboard-tab",
  Tab = "tab",
  SPFxTab = "tab-spfx",
  TabNonSso = "tab-non-sso",
  Bot = "bot",
  MessageExtension = "message-extension",
  M365SsoLaunchPage = "sso-launch-page",
  M365SearchApp = "search-app",
}

export const ResourceGroupEnvName = "AZURE_RESOURCE_GROUP_NAME";
export const BotIdEnvName = "BOT_ID";
export const AADAppIdEnvNames = ["AAD_APP_CLIENT_ID", BotIdEnvName];
export const TeamsAppIdEnvName = "TEAMS_APP_ID";
export const M365TitleIdEnvName = "M365_TITLE_ID";
