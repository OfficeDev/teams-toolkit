// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FuncQuestion, MultiSelectQuestion, NodeType, OptionItem, SingleSelectQuestion } from "fx-api";
import * as strings from "../../../resources/strings.json";

export const TabOptionItem: OptionItem = {
    id: "Tab",
    label: "Tab",
    cliName: "tab",
    description: "Tabs embeds a web app experience in a tab in a Teams chat, channel, or personal workspace.",
};

export const BotOptionItem: OptionItem = {
    id: "Bot",
    label: "Bot",
    cliName: "bot",
    description:
        "Bots allow you to interact with and obtain information in a text/search/conversational manner.",
};

export const MessageExtensionItem: OptionItem = {
    id: "MessageExtension",
    label: "Messaging Extension",
    cliName: "message-extension",
    description:
        "Messaging Extensions allow users to interact with a web service through buttons and forms in the Microsoft Teams client.",
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
    cliName: "azure",
    description: "Azure Cloud",
};

export const HostTypeOptionSPFx: OptionItem = {
    id:"SPFx",
    label: "SPFx",
    cliName: "spfx",
    description: "SharePoint Framework",
};

export const AzureResourceSQL: OptionItem = {
    id:"sql",
    label: "Azure SQL Database",
    description: "Azure SQL Database depends on Azure Functions.",
};

export const AzureResourceFunction: OptionItem = {
    id:"function",
    label: "Azure Functions",
    description: "Application backend.",
};

export const AzureResourceApim: OptionItem = {
    id:"apim",
    label: "Azure API Management",
    description: "Register APIs in Azure API Management",
};
 
export function createCapabilityQuestion(): MultiSelectQuestion {
    return {
        name: AzureSolutionQuestionNames.Capabilities,
        title: strings.solution.addCapability.title,
        prompt: strings.solution.addCapability.prompt,
        type: NodeType.multiSelect,
        option: [TabOptionItem, BotOptionItem, MessageExtensionItem],
        default: [TabOptionItem.id],
        onDidChangeSelection:async function(currentSelectedItems: OptionItem[], previousSelectedItems: OptionItem[]) : Promise<string[]>{
            const currentIds = new Set<string>();
            for(const i of currentSelectedItems) currentIds.add(i.id);
            if(currentSelectedItems.some(i=>i.id === BotOptionItem.id) && !previousSelectedItems.some(i=>i.id === BotOptionItem.id)){
                currentIds.delete(MessageExtensionItem.id);
            }
            if(currentSelectedItems.some(i=>i.id === MessageExtensionItem.id) && !previousSelectedItems.some(i=>i.id === MessageExtensionItem.id)){
                currentIds.delete(BotOptionItem.id);
            }
            return Array.from(currentIds);
        }
    };
}

export const FrontendHostTypeQuestion: SingleSelectQuestion = {
    name: AzureSolutionQuestionNames.HostType,
    title: strings.solution.hostType.title,
    type: NodeType.singleSelect,
    option: [HostTypeOptionAzure, HostTypeOptionSPFx],
    default: HostTypeOptionAzure.id,
};

export const AzureResourcesQuestion: MultiSelectQuestion = {
    name: AzureSolutionQuestionNames.AzureResources,
    title: strings.solution.azureResource.title,
    type: NodeType.multiSelect,
    option: [AzureResourceSQL, AzureResourceFunction],
    default: [],
    prompt: strings.solution.azureResource.prompt,
    onDidChangeSelection:async function(selectedItems: OptionItem[], previousSelectedItems: OptionItem[]) : Promise<string[]>{
        const hasSQL = selectedItems.some(i=>i.id === AzureResourceSQL.id);
        if(hasSQL){
            return [AzureResourceSQL.id, AzureResourceFunction.id];
        }
        return selectedItems.map(i=>i.id);
    }
};

export function createAddAzureResourceQuestion(alreadyHaveFunction: boolean, alreadhHaveSQL: boolean, alreadyHaveAPIM: boolean): MultiSelectQuestion {
    const options:OptionItem[] = [AzureResourceFunction];
    if(!alreadhHaveSQL) options.push(AzureResourceSQL);
    if(!alreadyHaveAPIM) options.push(AzureResourceApim);
    return {
        name: AzureSolutionQuestionNames.AddResources,
        title: strings.solution.addResource.title,
        type: NodeType.multiSelect,
        option: options,
        default: [],
        prompt: strings.solution.addResource.prompt,
        onDidChangeSelection:async function(currentSelectedItems: OptionItem[], previousSelectedItems: OptionItem[]) : Promise<string[]>{
            const hasSQL = currentSelectedItems.some(i=>i.id === AzureResourceSQL.id);
            const hasAPIM = currentSelectedItems.some(i=>i.id === AzureResourceApim.id);
            const ids = currentSelectedItems.map(i=>i.id);
            /// when SQL or APIM is selected and function is not selected, then function must be selected
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
        title: strings.solution.addCapability.title,
        type: NodeType.multiSelect,
        option: options,
        default: [],
        prompt: strings.solution.addCapability.prompt,
        onDidChangeSelection:async function(currentSelectedItems: OptionItem[], previousSelectedItems: OptionItem[]) : Promise<string[]>{
            const currentIds = new Set<string>();
            for(const i of currentSelectedItems) currentIds.add(i.id);
            if(currentSelectedItems.some(i=>i.id === BotOptionItem.id) && !previousSelectedItems.some(i=>i.id === BotOptionItem.id)){
                currentIds.delete(MessageExtensionItem.id);
            }
            if(currentSelectedItems.some(i=>i.id === MessageExtensionItem.id) && !previousSelectedItems.some(i=>i.id === MessageExtensionItem.id)){
                currentIds.delete(BotOptionItem.id);
            }
            return Array.from(currentIds);
        }
    };
}

export const DeployPluginSelectQuestion: MultiSelectQuestion = {
    name: AzureSolutionQuestionNames.PluginSelectionDeploy,
    title: `Select resource(s) to deploy`,
    type: NodeType.multiSelect,
    skipSingleOption: true,
    option: [],
    default: []
};


export const AskSubscriptionQuestion: FuncQuestion = {
    name: AzureSolutionQuestionNames.AskSub,
    title: "Please select a subscription",
    type: NodeType.func,
    namespace: "fx-solution-azure",
    method: "askSubscription"
};

export const ProgrammingLanguageQuestion: SingleSelectQuestion = {
    name: AzureSolutionQuestionNames.ProgrammingLanguage,
    title: "Select programming language for your project",
    type: NodeType.singleSelect,
    option: ["javascript", "typescript"],
    default: "javascript",
    skipSingleOption: true
};
