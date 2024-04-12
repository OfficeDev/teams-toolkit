// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  ApiMessageExtensionAuthOptions,
  CapabilityOptions,
  CustomCopilotAssistantOptions,
  CustomCopilotRagOptions,
  MeArchitectureOptions,
  NotificationTriggerOptions,
} from "../../../question";

export enum TemplateNames {
  Tab = "non-sso-tab",
  SsoTab = "sso-tab",
  TabSSR = "non-sso-tab-ssr",
  SsoTabSSR = "sso-tab-ssr",
  DashboardTab = "dashboard-tab",
  NotificationRestify = "notification-restify",
  NotificationWebApi = "notification-webapi",
  NotificationHttpTrigger = "notification-http-trigger",
  NotificationHttpTriggerIsolated = "notification-http-trigger-isolated",
  NotificationTimerTrigger = "notification-timer-trigger",
  NotificationTimerTriggerIsolated = "notification-timer-trigger-isolated",
  NotificationHttpTimerTrigger = "notification-http-timer-trigger",
  NotificationHttpTimerTriggerIsolated = "notification-http-timer-trigger-isolated",
  CommandAndResponse = "command-and-response",
  Workflow = "workflow",
  DefaultBot = "default-bot",
  MessageExtension = "message-extension",
  MessageExtensionAction = "message-extension-action",
  MessageExtensionSearch = "message-extension-search",
  MessageExtensionCopilot = "message-extension-copilot",
  M365MessageExtension = "m365-message-extension",
  TabAndDefaultBot = "non-sso-tab-default-bot",
  BotAndMessageExtension = "default-bot-message-extension",
  SsoTabObo = "sso-tab-with-obo-flow",
  LinkUnfurling = "link-unfurling",
  CopilotPluginFromScratch = "copilot-plugin-from-scratch",
  CopilotPluginFromScratchApiKey = "copilot-plugin-from-scratch-api-key",
  ApiMessageExtensionSso = "api-message-extension-sso",
  ApiPluginFromScratch = "api-plugin-from-scratch",
  AIBot = "ai-bot",
  AIAssistantBot = "ai-assistant-bot",
  CustomCopilotBasic = "custom-copilot-basic",
  CustomCopilotRagCustomize = "custom-copilot-rag-customize",
  CustomCopilotRagAzureAISearch = "custom-copilot-rag-azure-ai-search",
  CustomCopilotRagCustomApi = "custom-copilot-rag-custom-api",
  CustomCopilotRagMicrosoft365 = "custom-copilot-rag-microsoft365",
  CustomCopilotAssistantNew = "custom-copilot-assistant-new",
  CustomCopilotAssistantAssistantsApi = "custom-copilot-assistant-assistants-api",
}

export const Feature2TemplateName = {
  [`${CapabilityOptions.notificationBot().id}:${NotificationTriggerOptions.appService().id}`]:
    TemplateNames.NotificationRestify,
  [`${CapabilityOptions.notificationBot().id}:${NotificationTriggerOptions.appServiceForVS().id}`]:
    TemplateNames.NotificationWebApi,
  [`${CapabilityOptions.notificationBot().id}:${
    NotificationTriggerOptions.functionsHttpTrigger().id
  }`]: TemplateNames.NotificationHttpTrigger,
  [`${CapabilityOptions.notificationBot().id}:${
    NotificationTriggerOptions.functionsHttpTriggerIsolated().id
  }`]: TemplateNames.NotificationHttpTriggerIsolated,
  [`${CapabilityOptions.notificationBot().id}:${
    NotificationTriggerOptions.functionsTimerTrigger().id
  }`]: TemplateNames.NotificationTimerTrigger,
  [`${CapabilityOptions.notificationBot().id}:${
    NotificationTriggerOptions.functionsTimerTriggerIsolated().id
  }`]: TemplateNames.NotificationTimerTriggerIsolated,
  [`${CapabilityOptions.notificationBot().id}:${
    NotificationTriggerOptions.functionsHttpAndTimerTrigger().id
  }`]: TemplateNames.NotificationHttpTimerTrigger,
  [`${CapabilityOptions.notificationBot().id}:${
    NotificationTriggerOptions.functionsHttpAndTimerTriggerIsolated().id
  }`]: TemplateNames.NotificationHttpTimerTriggerIsolated,
  [`${CapabilityOptions.commandBot().id}:undefined`]: TemplateNames.CommandAndResponse,
  [`${CapabilityOptions.workflowBot().id}:undefined`]: TemplateNames.Workflow,
  [`${CapabilityOptions.basicBot().id}:undefined`]: TemplateNames.DefaultBot,
  [`${CapabilityOptions.collectFormMe().id}:undefined`]: TemplateNames.MessageExtensionAction,
  [`${CapabilityOptions.me().id}:undefined`]: TemplateNames.MessageExtension,
  [`${CapabilityOptions.m365SearchMe().id}:undefined:${MeArchitectureOptions.botMe().id}`]:
    TemplateNames.M365MessageExtension,
  [`${CapabilityOptions.m365SearchMe().id}:undefined:${MeArchitectureOptions.botPlugin().id}`]:
    TemplateNames.MessageExtensionCopilot,
  [`${CapabilityOptions.SearchMe().id}:undefined`]: TemplateNames.MessageExtensionSearch,
  [`${CapabilityOptions.tab().id}:undefined`]: TemplateNames.SsoTab,
  [`${CapabilityOptions.nonSsoTab().id}:undefined`]: TemplateNames.Tab,
  [`${CapabilityOptions.m365SsoLaunchPage().id}:undefined`]: TemplateNames.SsoTabObo,
  [`${CapabilityOptions.dashboardTab().id}:undefined`]: TemplateNames.DashboardTab,
  [`${CapabilityOptions.nonSsoTabAndBot().id}:undefined`]: TemplateNames.TabAndDefaultBot,
  [`${CapabilityOptions.botAndMe().id}:undefined`]: TemplateNames.BotAndMessageExtension,
  [`${CapabilityOptions.linkUnfurling().id}:undefined`]: TemplateNames.LinkUnfurling,
  [`${CapabilityOptions.copilotPluginNewApi().id}:undefined`]: TemplateNames.ApiPluginFromScratch,
  [`${CapabilityOptions.m365SearchMe().id}:undefined:${MeArchitectureOptions.newApi().id}:${
    ApiMessageExtensionAuthOptions.none().id
  }`]: TemplateNames.CopilotPluginFromScratch,
  [`${CapabilityOptions.m365SearchMe().id}:undefined:${MeArchitectureOptions.newApi().id}:${
    ApiMessageExtensionAuthOptions.apiKey().id
  }`]: TemplateNames.CopilotPluginFromScratchApiKey,
  [`${CapabilityOptions.m365SearchMe().id}:undefined:${MeArchitectureOptions.newApi().id}:${
    ApiMessageExtensionAuthOptions.microsoftEntra().id
  }`]: TemplateNames.ApiMessageExtensionSso,
  [`${CapabilityOptions.aiBot().id}:undefined`]: TemplateNames.AIBot,
  [`${CapabilityOptions.aiAssistantBot().id}:undefined`]: TemplateNames.AIAssistantBot,
  [`${CapabilityOptions.tab().id}:ssr`]: TemplateNames.SsoTabSSR,
  [`${CapabilityOptions.nonSsoTab().id}:ssr`]: TemplateNames.TabSSR,
  [`${CapabilityOptions.customCopilotBasic().id}:undefined`]: TemplateNames.CustomCopilotBasic,
  [`${CapabilityOptions.customCopilotRag().id}:undefined:${
    CustomCopilotRagOptions.customize().id
  }`]: TemplateNames.CustomCopilotRagCustomize,
  [`${CapabilityOptions.customCopilotRag().id}:undefined:${
    CustomCopilotRagOptions.azureAISearch().id
  }`]: TemplateNames.CustomCopilotRagAzureAISearch,
  [`${CapabilityOptions.customCopilotRag().id}:undefined:${
    CustomCopilotRagOptions.customApi().id
  }`]: TemplateNames.CustomCopilotRagCustomApi,
  [`${CapabilityOptions.customCopilotRag().id}:undefined:${
    CustomCopilotRagOptions.microsoft365().id
  }`]: TemplateNames.CustomCopilotRagMicrosoft365,
  [`${CapabilityOptions.customCopilotAssistant().id}:undefined:${
    CustomCopilotAssistantOptions.new().id
  }`]: TemplateNames.CustomCopilotAssistantNew,
  [`${CapabilityOptions.customCopilotAssistant().id}:undefined:${
    CustomCopilotAssistantOptions.assistantsApi().id
  }`]: TemplateNames.CustomCopilotAssistantAssistantsApi,
};
