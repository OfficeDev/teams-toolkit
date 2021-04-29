// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FuncQuestion, MultiSelectQuestion, NodeType, OptionItem, SingleSelectQuestion } from "fx-api";
import * as strings from "../../../resources/strings.json";

export const TabOptionItem: OptionItem = {
    id: "Tab",
    label: "Tab",
    cliName: "tab",
    description: "UI-based app",
    detail: "Tabs are Teams-aware webpages embedded in Microsoft Teams."
};

export const BotOptionItem: OptionItem = {
    id: "Bot",
    label: "Bot",
    cliName: "bot",
    description: "Conversational Agent",
    detail:"Bots allow users to interfact with your web service through text, interactive cards, and task modules.",
};

export const MessageExtensionItem: OptionItem = {
    id: "MessageExtension",
    label: "Message Extension",
    cliName: "message-extension",
    description: "Custom UI when users compose messages in Teams",
    detail:"Messaging Extensions allow users to interact with your web service through buttons and forms in the Microsoft Teams client."
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
    id:"Azure",
    label: "Azure",
    cliName: "azure"
};

export const HostTypeOptionSPFx: OptionItem = {
    id:"SPFx",
    label: "SharePoint Framework (SPFx)",
    cliName: "spfx"
};

export const AzureResourceSQL: OptionItem = {
    id:"sql",
    label: "Azure SQL Database"
};

export const AzureResourceFunction: OptionItem = {
    id:"function",
    label: "Azure Function App"
};

export const AzureResourceApim: OptionItem = {
    id:"apim",
    label: "Register APIs in Azure API Management"
};
 
export function createCapabilityQuestion(): MultiSelectQuestion {
    return {
        name: AzureSolutionQuestionNames.Capabilities,
        title: "Select capabilities",
        type: NodeType.multiSelect,
        option: [TabOptionItem, BotOptionItem, MessageExtensionItem],
        default: [TabOptionItem.id],
        placeholder: "Select at least 1 capability"
    };
}

export const FrontendHostTypeQuestion: SingleSelectQuestion = {
    name: AzureSolutionQuestionNames.HostType,
    title: "Frontend hosting type",
    type: NodeType.singleSelect,
    option: {namespace: "fx-solution-azure", method : "listHostTypeOptions"},
    default: HostTypeOptionAzure.id,
    placeholder: "Select a hosting type",
    skipSingleOption: true
};

export const AzureResourcesQuestion: MultiSelectQuestion = {
    name: AzureSolutionQuestionNames.AzureResources,
    title: "Cloud resources",
    type: NodeType.multiSelect,
    option: [AzureResourceSQL, AzureResourceFunction],
    default: [],
    onDidChangeSelection:async function(selectedItems: OptionItem[], previousSelectedItems: OptionItem[]) : Promise<string[]>{
        const hasSQL = selectedItems.some(i=>i.id === AzureResourceSQL.id);
        if(hasSQL){
            return [AzureResourceSQL.id, AzureResourceFunction.id];
        }
        return selectedItems.map(i=>i.id);
    },
    placeholder: "Select a resource (optional)"
};

export function createAddAzureResourceQuestion(alreadyHaveFunction: boolean, alreadhHaveSQL: boolean, alreadyHaveAPIM: boolean): MultiSelectQuestion {
    const options:OptionItem[] = [AzureResourceFunction];
    if(!alreadhHaveSQL) options.push(AzureResourceSQL);
    if(!alreadyHaveAPIM) options.push(AzureResourceApim);
    return {
        name: AzureSolutionQuestionNames.AddResources,
        title: "Cloud resources",
        type: NodeType.multiSelect,
        option: options,
        default: [],
        onDidChangeSelection:async function(currentSelectedItems: OptionItem[], previousSelectedItems: OptionItem[]) : Promise<string[]>{
            const hasSQL = currentSelectedItems.some(i=>i.id === AzureResourceSQL.id);
            const hasAPIM = currentSelectedItems.some(i=>i.id === AzureResourceApim.id);
            const ids = currentSelectedItems.map(i=>i.id);
            if( (hasSQL||hasAPIM) && !alreadyHaveFunction && !ids.includes(AzureResourceFunction.id)){
                ids.push(AzureResourceFunction.id);
            }
            return ids;
        }
    };
}

export function createAddCapabilityQuestion(alreadyHaveTab: boolean, alreadyHaveBot: boolean): MultiSelectQuestion {
    const options:OptionItem[] = [];
    if(!alreadyHaveTab) options.push(TabOptionItem);
    if(!alreadyHaveBot){
        options.push(BotOptionItem);
        options.push(MessageExtensionItem);
    } 
    return {
        name: AzureSolutionQuestionNames.Capabilities,
        title: "Choose capabilities",
        type: NodeType.multiSelect,
        option: options,
        default: []
    };
}

export const DeployPluginSelectQuestion: MultiSelectQuestion = {
    name: AzureSolutionQuestionNames.PluginSelectionDeploy,
    title: `Select resources`,
    type: NodeType.multiSelect,
    skipSingleOption: true,
    option: [],
    default: []
};


export const AskSubscriptionQuestion: FuncQuestion = {
    name: AzureSolutionQuestionNames.AskSub,
    title: "Select a subscription",
    type: NodeType.func,
    namespace: "fx-solution-azure",
    method: "askSubscription"
};

export const ProgrammingLanguageQuestion: SingleSelectQuestion = {
    name: AzureSolutionQuestionNames.ProgrammingLanguage,
    title: "Programming Language",
    type: NodeType.singleSelect,
    option: {namespace:"fx-solution-azure", method: "listLanguageOptions"},
    default: "javascript",
    placeholder: {namespace:"fx-solution-azure", method: "getLanguagePlaceholder"},
};
