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

export const strings = {
  deleteResourceGroup: {
    success: `[Success] Resource group %s is deleted.`,
    failed: `[Failed] Resource group %s is not deleted.`,
    skipped: `[Skipped] Resource group %s does not exist.`,
  },
};

export enum TemplateProject {
  HelloWorldTabBackEnd = "hello-world-tab-with-backend",
  ContactExporter = "graph-toolkit-contact-exporter",
  HelloWorldBotSSO = "bot-sso",
  TodoListSpfx = "todo-list-SPFx",
  MyFirstMetting = "hello-world-in-meeting",
  TodoListM365 = "todo-list-with-Azure-backend-M365",
  NpmSearch = "NPM-search-connector-M365",
  AdaptiveCard = "adaptive-card-notification",
  IncomingWebhook = "incoming-webhook-notification",
  StockUpdate = "stocks-update-notification-bot",
  QueryOrg = "query-org-user-with-message-extension-sso",
  Dashboard = "team-central-dashboard",
  GraphConnector = "graph-connector-app",
  OneProductivityHub = "graph-toolkit-one-productivity-hub",
  TodoListBackend = "todo-list-with-Azure-backend",
  ShareNow = "share-now",
  OutlookAddIn = "hello-world-teams-tab-and-outlook-add-in",
  AssistDashboard = "developer-assist-dashboard",
  ProactiveMessaging = "bot-proactive-messaging-teamsfx",
  Deeplinking = "deep-linking-hello-world-tab-without-sso-M365",
}
