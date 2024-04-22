// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Inputs } from "@microsoft/teamsfx-api";
import {
  ApiMessageExtensionAuthOptions,
  CapabilityOptions,
  CustomCopilotAssistantOptions,
  CustomCopilotRagOptions,
  MeArchitectureOptions,
  NotificationTriggerOptions,
  ProgrammingLanguage,
  QuestionNames,
} from "../../../question";

export enum TemplateNames {
  Tab = "non-sso-tab",
  SsoTab = "sso-tab",
  SsoTabObo = "sso-tab-with-obo-flow",
  TabSSR = "non-sso-tab-ssr",
  SsoTabSSR = "sso-tab-ssr",
  DashboardTab = "dashboard-tab",
  NotificationRestify = "notification-restify",
  NotificationWebApi = "notification-webapi",
  NotificationHttpTriggerIsolated = "notification-http-trigger-isolated",
  NotificationHttpTrigger = "notification-http-trigger",
  NotificationTimerTriggerIsolated = "notification-timer-trigger-isolated",
  NotificationTimerTrigger = "notification-timer-trigger",
  NotificationHttpTimerTriggerIsolated = "notification-http-timer-trigger-isolated",
  NotificationHttpTimerTrigger = "notification-http-timer-trigger",
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
  LinkUnfurling = "link-unfurling",
  AIBot = "ai-bot",
  AIAssistantBot = "ai-assistant-bot",
  ApiPluginFromScratch = "api-plugin-from-scratch",
  CopilotPluginFromScratch = "copilot-plugin-from-scratch",
  CopilotPluginFromScratchApiKey = "copilot-plugin-from-scratch-api-key",
  ApiMessageExtensionSso = "api-message-extension-sso",
  CustomCopilotBasic = "custom-copilot-basic",
  CustomCopilotRagCustomize = "custom-copilot-rag-customize",
  CustomCopilotRagAzureAISearch = "custom-copilot-rag-azure-ai-search",
  CustomCopilotRagCustomApi = "custom-copilot-rag-custom-api",
  CustomCopilotRagMicrosoft365 = "custom-copilot-rag-microsoft365",
  CustomCopilotAssistantNew = "custom-copilot-assistant-new",
  CustomCopilotAssistantAssistantsApi = "custom-copilot-assistant-assistants-api",
}

// TODO: remove this mapping after all generators are migrated to new generator pattern
export const Feature2TemplateName = {
  [`${CapabilityOptions.nonSsoTab().id}:undefined`]: TemplateNames.Tab,
  [`${CapabilityOptions.tab().id}:undefined`]: TemplateNames.SsoTab,
  [`${CapabilityOptions.m365SsoLaunchPage().id}:undefined`]: TemplateNames.SsoTabObo,
  [`${CapabilityOptions.nonSsoTab().id}:ssr`]: TemplateNames.TabSSR,
  [`${CapabilityOptions.tab().id}:ssr`]: TemplateNames.SsoTabSSR,
  [`${CapabilityOptions.dashboardTab().id}:undefined`]: TemplateNames.DashboardTab,
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
  [`${CapabilityOptions.me().id}:undefined`]: TemplateNames.MessageExtension,
  [`${CapabilityOptions.collectFormMe().id}:undefined`]: TemplateNames.MessageExtensionAction,
  [`${CapabilityOptions.SearchMe().id}:undefined`]: TemplateNames.MessageExtensionSearch,
  [`${CapabilityOptions.m365SearchMe().id}:undefined:${MeArchitectureOptions.botPlugin().id}`]:
    TemplateNames.MessageExtensionCopilot,
  [`${CapabilityOptions.m365SearchMe().id}:undefined:${MeArchitectureOptions.botMe().id}`]:
    TemplateNames.M365MessageExtension,
  [`${CapabilityOptions.nonSsoTabAndBot().id}:undefined`]: TemplateNames.TabAndDefaultBot,
  [`${CapabilityOptions.botAndMe().id}:undefined`]: TemplateNames.BotAndMessageExtension,
  [`${CapabilityOptions.linkUnfurling().id}:undefined`]: TemplateNames.LinkUnfurling,
  [`${CapabilityOptions.aiBot().id}:undefined`]: TemplateNames.AIBot,
  [`${CapabilityOptions.aiAssistantBot().id}:undefined`]: TemplateNames.AIAssistantBot,
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

export function tryGetTemplateName(inputs: Inputs): TemplateNames | undefined {
  return inputs2TemplateName.find((item) =>
    Object.keys(item.inputs).every((key) => item.inputs[key] === inputs[key])
  )?.name;
}

export function getTemplateName(inputs: Inputs): TemplateNames {
  const templateName = tryGetTemplateName(inputs);
  if (!templateName) {
    throw new Error("Template name not found");
  }
  return templateName;
}

// When multiple template name matches, only the top one will be picked.
export const inputs2TemplateName: { inputs: { [key: string]: any }; name: TemplateNames }[] = [
  {
    inputs: { [QuestionNames.Capabilities]: CapabilityOptions.nonSsoTab().id },
    name: TemplateNames.Tab,
  },
  {
    inputs: { [QuestionNames.Capabilities]: CapabilityOptions.tab().id },
    name: TemplateNames.SsoTab,
  },
  {
    inputs: { [QuestionNames.Capabilities]: CapabilityOptions.m365SsoLaunchPage().id },
    name: TemplateNames.SsoTabObo,
  },
  {
    inputs: { [QuestionNames.Capabilities]: CapabilityOptions.dashboardTab().id },
    name: TemplateNames.DashboardTab,
  },
  {
    inputs: {
      [QuestionNames.Capabilities]: CapabilityOptions.notificationBot().id,
      [QuestionNames.BotTrigger]: NotificationTriggerOptions.appService().id,
    },
    name: TemplateNames.NotificationRestify,
  },
  {
    inputs: {
      [QuestionNames.ProgrammingLanguage]: ProgrammingLanguage.CSharp,
      [QuestionNames.Capabilities]: CapabilityOptions.notificationBot().id,
      [QuestionNames.BotTrigger]: NotificationTriggerOptions.appServiceForVS().id,
    },
    name: TemplateNames.NotificationWebApi,
  },
  {
    inputs: {
      [QuestionNames.ProgrammingLanguage]: ProgrammingLanguage.CSharp,
      [QuestionNames.Capabilities]: CapabilityOptions.notificationBot().id,
      [QuestionNames.BotTrigger]: NotificationTriggerOptions.functionsHttpTrigger().id,
      ["isIsolated"]: true,
    },
    name: TemplateNames.NotificationHttpTriggerIsolated,
  },
  {
    inputs: {
      [QuestionNames.Capabilities]: CapabilityOptions.notificationBot().id,
      [QuestionNames.BotTrigger]: NotificationTriggerOptions.functionsHttpTrigger().id,
    },
    name: TemplateNames.NotificationHttpTrigger,
  },
  {
    inputs: {
      [QuestionNames.ProgrammingLanguage]: ProgrammingLanguage.CSharp,
      [QuestionNames.Capabilities]: CapabilityOptions.notificationBot().id,
      [QuestionNames.BotTrigger]: NotificationTriggerOptions.functionsTimerTrigger().id,
      ["isIsolated"]: true,
    },
    name: TemplateNames.NotificationTimerTriggerIsolated,
  },
  {
    inputs: {
      [QuestionNames.Capabilities]: CapabilityOptions.notificationBot().id,
      [QuestionNames.BotTrigger]: NotificationTriggerOptions.functionsTimerTrigger().id,
    },
    name: TemplateNames.NotificationTimerTrigger,
  },
  {
    inputs: {
      [QuestionNames.ProgrammingLanguage]: ProgrammingLanguage.CSharp,
      [QuestionNames.Capabilities]: CapabilityOptions.notificationBot().id,
      [QuestionNames.BotTrigger]: NotificationTriggerOptions.functionsHttpAndTimerTrigger().id,
      ["isIsolated"]: true,
    },
    name: TemplateNames.NotificationHttpTimerTriggerIsolated,
  },
  {
    inputs: {
      [QuestionNames.Capabilities]: CapabilityOptions.notificationBot().id,
      [QuestionNames.BotTrigger]: NotificationTriggerOptions.functionsHttpAndTimerTrigger().id,
    },
    name: TemplateNames.NotificationHttpTimerTrigger,
  },
  {
    inputs: {
      [QuestionNames.Capabilities]: CapabilityOptions.commandBot().id,
    },
    name: TemplateNames.CommandAndResponse,
  },
  {
    inputs: {
      [QuestionNames.Capabilities]: CapabilityOptions.workflowBot().id,
    },
    name: TemplateNames.Workflow,
  },
  {
    inputs: {
      [QuestionNames.Capabilities]: CapabilityOptions.basicBot().id,
    },
    name: TemplateNames.DefaultBot,
  },
  {
    inputs: {
      [QuestionNames.Capabilities]: CapabilityOptions.me().id,
    },
    name: TemplateNames.MessageExtension,
  },
  {
    inputs: {
      [QuestionNames.Capabilities]: CapabilityOptions.collectFormMe().id,
    },
    name: TemplateNames.MessageExtensionAction,
  },
  {
    inputs: { [QuestionNames.Capabilities]: CapabilityOptions.SearchMe().id },
    name: TemplateNames.MessageExtensionSearch,
  },
  {
    inputs: {
      [QuestionNames.Capabilities]: CapabilityOptions.m365SearchMe().id,
      [QuestionNames.MeArchitectureType]: MeArchitectureOptions.botPlugin().id,
    },
    name: TemplateNames.MessageExtensionCopilot,
  },
  {
    inputs: {
      [QuestionNames.Capabilities]: CapabilityOptions.m365SearchMe().id,
      [QuestionNames.MeArchitectureType]: MeArchitectureOptions.botMe().id,
    },
    name: TemplateNames.M365MessageExtension,
  },
  {
    inputs: {
      [QuestionNames.Capabilities]: CapabilityOptions.nonSsoTabAndBot().id,
    },
    name: TemplateNames.TabAndDefaultBot,
  },
  {
    inputs: {
      [QuestionNames.Capabilities]: CapabilityOptions.botAndMe().id,
    },
    name: TemplateNames.BotAndMessageExtension,
  },
  {
    inputs: {
      [QuestionNames.Capabilities]: CapabilityOptions.linkUnfurling().id,
    },
    name: TemplateNames.LinkUnfurling,
  },
  {
    inputs: {
      [QuestionNames.Capabilities]: CapabilityOptions.aiBot().id,
    },
    name: TemplateNames.AIBot,
  },
  {
    inputs: {
      [QuestionNames.Capabilities]: CapabilityOptions.aiAssistantBot().id,
    },
    name: TemplateNames.AIAssistantBot,
  },
  {
    inputs: {
      [QuestionNames.Capabilities]: CapabilityOptions.copilotPluginNewApi().id,
    },
    name: TemplateNames.ApiPluginFromScratch,
  },
  {
    inputs: {
      [QuestionNames.Capabilities]: CapabilityOptions.m365SearchMe().id,
      [QuestionNames.MeArchitectureType]: MeArchitectureOptions.newApi().id,
      [QuestionNames.ApiMEAuth]: ApiMessageExtensionAuthOptions.none().id,
    },
    name: TemplateNames.CopilotPluginFromScratch,
  },
  {
    inputs: {
      [QuestionNames.Capabilities]: CapabilityOptions.m365SearchMe().id,
      [QuestionNames.MeArchitectureType]: MeArchitectureOptions.newApi().id,
      [QuestionNames.ApiMEAuth]: ApiMessageExtensionAuthOptions.apiKey().id,
    },
    name: TemplateNames.CopilotPluginFromScratchApiKey,
  },
  {
    inputs: {
      [QuestionNames.Capabilities]: CapabilityOptions.m365SearchMe().id,
      [QuestionNames.MeArchitectureType]: MeArchitectureOptions.newApi().id,
      [QuestionNames.ApiMEAuth]: ApiMessageExtensionAuthOptions.microsoftEntra().id,
    },
    name: TemplateNames.ApiMessageExtensionSso,
  },
  {
    inputs: { [QuestionNames.Capabilities]: CapabilityOptions.customCopilotBasic().id },
    name: TemplateNames.CustomCopilotBasic,
  },
  {
    inputs: {
      [QuestionNames.Capabilities]: CapabilityOptions.customCopilotRag().id,
      [QuestionNames.CustomCopilotRag]: CustomCopilotRagOptions.customize().id,
    },
    name: TemplateNames.CustomCopilotRagCustomize,
  },
  {
    inputs: {
      [QuestionNames.Capabilities]: CapabilityOptions.customCopilotRag().id,
      [QuestionNames.CustomCopilotRag]: CustomCopilotRagOptions.azureAISearch().id,
    },
    name: TemplateNames.CustomCopilotRagAzureAISearch,
  },
  {
    inputs: {
      [QuestionNames.Capabilities]: CapabilityOptions.customCopilotRag().id,
      [QuestionNames.CustomCopilotRag]: CustomCopilotRagOptions.customApi().id,
    },
    name: TemplateNames.CustomCopilotRagCustomApi,
  },
  {
    inputs: {
      [QuestionNames.Capabilities]: CapabilityOptions.customCopilotRag().id,
      [QuestionNames.CustomCopilotRag]: CustomCopilotRagOptions.microsoft365().id,
    },
    name: TemplateNames.CustomCopilotRagMicrosoft365,
  },
  {
    inputs: {
      [QuestionNames.Capabilities]: CapabilityOptions.customCopilotAssistant().id,
      [QuestionNames.CustomCopilotAssistant]: CustomCopilotAssistantOptions.new().id,
    },
    name: TemplateNames.CustomCopilotAssistantNew,
  },
  {
    inputs: {
      [QuestionNames.Capabilities]: CapabilityOptions.customCopilotAssistant().id,
      [QuestionNames.CustomCopilotAssistant]: CustomCopilotAssistantOptions.assistantsApi().id,
    },
    name: TemplateNames.CustomCopilotAssistantAssistantsApi,
  },
];
