// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  FuncQuestion,
  Inputs,
  MultiSelectQuestion,
  ok,
  OptionItem,
  returnSystemError,
  SingleSelectQuestion,
  StaticOptions,
  Void,
} from "@microsoft/teamsfx-api";
import { SolutionError } from "./constants";

export const TabOptionItem: OptionItem = {
  id: "Tab",
  label: "Tab",
  cliName: "tab",
  description: "UI-based app",
  detail: "Teams-aware webpages embedded in Microsoft Teams",
};

export const BotOptionItem: OptionItem = {
  id: "Bot",
  label: "Bot",
  cliName: "bot",
  description: "Conversational Agent",
  detail: "Running simple and repetitive automated tasks through conversations",
};

export const MessageExtensionItem: OptionItem = {
  id: "MessagingExtension",
  label: "Messaging Extension",
  cliName: "messaging-extension",
  description: "Custom UI when users compose messages in Teams",
  detail: "Inserting app content or acting on a message without leaving the conversation",
};

export enum AzureSolutionQuestionNames {
  Capabilities = "capabilities",
  TabScopes = "tab-scopes",
  HostType = "host-type",
  AzureResources = "azure-resources",
  PluginSelectionDeploy = "deploy-plugin",
  AddResources = "add-azure-resources",
  AppName = "app-name",
  AskSub = "subscription",
  ProgrammingLanguage = "programming-language",
}

export const HostTypeOptionAzure: OptionItem = {
  id: "Azure",
  label: "Azure",
  cliName: "azure",
};

export const HostTypeOptionSPFx: OptionItem = {
  id: "SPFx",
  label: "SharePoint Framework (SPFx)",
  cliName: "spfx",
};

export const AzureResourceSQL: OptionItem = {
  id: "sql",
  label: "Azure SQL Database",
  description: "Azure Function App will be also selected to access Azure SQL Database",
};

export const AzureResourceFunction: OptionItem = {
  id: "function",
  label: "Azure Function App",
};

export const AzureResourceApim: OptionItem = {
  id: "apim",
  label: "Register APIs in Azure API Management",
  description: "Azure Function App will be also selected to be published as an API",
};

export function createCapabilityQuestion(): MultiSelectQuestion {
  return {
    name: AzureSolutionQuestionNames.Capabilities,
    title: "Select capabilities",
    type: "multiSelect",
    staticOptions: [TabOptionItem, BotOptionItem, MessageExtensionItem],
    default: [TabOptionItem.id],
    placeholder: "Select at least 1 capability",
    validation: { minItems: 1 },
  };
}

export const FrontendHostTypeQuestion: SingleSelectQuestion = {
  name: AzureSolutionQuestionNames.HostType,
  title: "Frontend hosting type",
  type: "singleSelect",
  staticOptions: [HostTypeOptionAzure, HostTypeOptionSPFx],
  dynamicOptions: (previousAnswers: Inputs): StaticOptions => {
    const cap = previousAnswers[AzureSolutionQuestionNames.Capabilities] as string[];
    if (cap) {
      if (cap.includes(BotOptionItem.id) || cap.includes(MessageExtensionItem.id))
        return [HostTypeOptionAzure];
      if (cap.includes(TabOptionItem.id)) return [HostTypeOptionAzure, HostTypeOptionSPFx];
      return [];
    }
    throw returnSystemError(
      new Error("Capabilities is undefined"),
      "Solution",
      SolutionError.InternelError
    );
  },
  default: HostTypeOptionAzure.id,
  placeholder: "Select a hosting type",
  skipSingleOption: true,
};

export const AzureResourcesQuestion: MultiSelectQuestion = {
  name: AzureSolutionQuestionNames.AzureResources,
  title: "Cloud resources",
  type: "multiSelect",
  staticOptions: [AzureResourceSQL, AzureResourceFunction],
  default: [],
  onDidChangeSelection: async function (
    currentSelectedIds: Set<string>,
    previousSelectedIds: Set<string>
  ): Promise<Set<string>> {
    if (currentSelectedIds.has(AzureResourceSQL.id)) {
      currentSelectedIds.add(AzureResourceFunction.id);
    }
    return currentSelectedIds;
  },
  placeholder: "Select a resource (optional)",
};

export function createAddAzureResourceQuestion(
  alreadyHaveFunction: boolean,
  alreadhHaveSQL: boolean,
  alreadyHaveAPIM: boolean
): MultiSelectQuestion {
  const options: OptionItem[] = [AzureResourceFunction];
  if (!alreadhHaveSQL) options.push(AzureResourceSQL);
  if (!alreadyHaveAPIM) options.push(AzureResourceApim);
  return {
    name: AzureSolutionQuestionNames.AddResources,
    title: "Cloud resources",
    type: "multiSelect",
    staticOptions: options,
    default: [],
    onDidChangeSelection: async function (
      currentSelectedIds: Set<string>,
      previousSelectedIds: Set<string>
    ): Promise<Set<string>> {
      const hasSQL = currentSelectedIds.has(AzureResourceSQL.id);
      const hasAPIM = currentSelectedIds.has(AzureResourceApim.id);
      if ((hasSQL || hasAPIM) && !alreadyHaveFunction) {
        currentSelectedIds.add(AzureResourceFunction.id);
      }
      return currentSelectedIds;
    },
  };
}

export function addCapabilityQuestion(
  alreadyHaveTab: boolean,
  alreadyHaveBot: boolean
): MultiSelectQuestion {
  const options: OptionItem[] = [];
  if (!alreadyHaveTab) options.push(TabOptionItem);
  if (!alreadyHaveBot) {
    options.push(BotOptionItem);
    options.push(MessageExtensionItem);
  }
  return {
    name: AzureSolutionQuestionNames.Capabilities,
    title: "Choose capabilities",
    type: "multiSelect",
    staticOptions: options,
    default: [],
  };
}

export const DeployPluginSelectQuestion: MultiSelectQuestion = {
  name: AzureSolutionQuestionNames.PluginSelectionDeploy,
  title: `Select resources`,
  type: "multiSelect",
  skipSingleOption: true,
  staticOptions: [],
  default: [],
};

export const AskSubscriptionQuestion: FuncQuestion = {
  name: AzureSolutionQuestionNames.AskSub,
  type: "func",
  func: async (inputs: Inputs): Promise<Void> => {
    return ok(Void);
  },
};

export const ProgrammingLanguageQuestion: SingleSelectQuestion = {
  name: AzureSolutionQuestionNames.ProgrammingLanguage,
  title: "Programming Language",
  type: "singleSelect",
  staticOptions: [
    { id: "javascript", label: "JavaScript" },
    { id: "typescript", label: "TypeScript" },
  ],
  dynamicOptions: (inputs: Inputs): StaticOptions => {
    const hostType = inputs[AzureSolutionQuestionNames.HostType] as string;
    if (HostTypeOptionSPFx.id === hostType) return [{ id: "typescript", label: "TypeScript" }];
    return [
      { id: "javascript", label: "JavaScript" },
      { id: "typescript", label: "TypeScript" },
    ];
  },
  skipSingleOption: true,
  default: (inputs: Inputs) => {
    const hostType = inputs[AzureSolutionQuestionNames.HostType] as string;
    if (HostTypeOptionSPFx.id === hostType) return "typescript";
    return "javascript";
  },
  placeholder: (inputs: Inputs): string => {
    const hostType = inputs[AzureSolutionQuestionNames.HostType] as string;
    if (HostTypeOptionSPFx.id === hostType) return "SPFx is currently supporting TypeScript only.";
    return "Select a programming language.";
  },
};
