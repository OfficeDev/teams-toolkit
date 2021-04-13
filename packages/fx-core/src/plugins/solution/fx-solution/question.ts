// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FuncQuestion, MultiSelectQuestion, NodeType, OptionItem, SingleSelectQuestion } from "fx-api";

export const TabOptionItem: OptionItem = {
    id: "Tab",
    label: "Tab",
    description: "Embeds a web-based app experience in a tab in a Teams chat, channel, or personal workspace.",
};

export const BotOptionItem: OptionItem = {
    id: "Bot",
    label: "Bot",
    description:
        "Bots allow you to interact with and obtain information from a software or website in a text/search/conversational manner.",
};

export const MessageExtensionItem: OptionItem = {
    id: "MessageExtension",
    label: "MessageExtension",
    description:
        "Messaging extensions allow users to interact with your web service through buttons and forms in the Microsoft Teams client.",
};

export enum AzureSolutionQuestionNames {
    Capabilities = "capabilities",
    TabScopes = "tab-scopes",
    HostType = "host-type",
    AzureResources = "azure-resources",
    PluginSelectionDeploy = "deploy-plugin",
    AddResources = "add-azure-resources",
    AddCapabilities = "add-capabilities",
    AppName = "app-name",
    AskSub = "ask-subscription"
}

export const HostTypeOptionAzure: OptionItem = {
    id:"Azure",
    label: "Azure",
    description: "Azure Cloud",
};

export const HostTypeOptionSPFx: OptionItem = {
    id:"SPFx",
    label: "SPFx",
    description: "SharePoint Framework",
};

export const AzureResourceSQL: OptionItem = {
    id:"sql",
    label: "sql",
    description: "Azure SQL Database",
};

export const AzureResourceFunction: OptionItem = {
    id:"function",
    label: "function",
    description: "New APIs from Azure Functions",
};

export const AzureResourceApim: OptionItem = {
    id:"apim",
    label: "apim",
    description: "New API in Azure API Management",
};
 
export function createCapabilityQuestion(featureFlag: boolean): MultiSelectQuestion {
    return {
        name: AzureSolutionQuestionNames.Capabilities,
        title: "Add capabilities",
        prompt: "Choose the capabilities for your project setup",
        type: NodeType.multiSelect,
        option: featureFlag ? [TabOptionItem, BotOptionItem, MessageExtensionItem] : [TabOptionItem],
        default: [TabOptionItem.id]
    };
}

export const TabScopQuestion: SingleSelectQuestion = {
    name: AzureSolutionQuestionNames.TabScopes,
    title: "Tab scopes",
    type: NodeType.singleSelect,
    option: ["personal"],
    default: "personal",
};

export const FrontendHostTypeQuestion: SingleSelectQuestion = {
    name: AzureSolutionQuestionNames.HostType,
    title: "Select front-end hosting type",
    type: NodeType.singleSelect,
    option: [HostTypeOptionAzure, HostTypeOptionSPFx],
    default: HostTypeOptionAzure.id,
};

export const AzureResourcesQuestion: MultiSelectQuestion = {
    name: AzureSolutionQuestionNames.AzureResources,
    title: "Additional cloud resources",
    type: NodeType.multiSelect,
    option: [AzureResourceSQL, AzureResourceFunction],
    default: [],
    onDidChangeSelection:async function(selectedItems: OptionItem[]) : Promise<string[]>{
        const hasSQL = selectedItems.some(i=>i.id === AzureResourceSQL.id);
        if(hasSQL){
            return [AzureResourceSQL.id, AzureResourceFunction.id];
        }
        return selectedItems.map(i=>i.id);
    }
};

// export const AddAzureResourceQuestion: MultiSelectQuestion = {
//     name: AzureSolutionQuestionNames.AddResources,
//     title: 'Select Azure resources to add',
//     type: NodeType.multiSelect,
//     option: [AzureResourceSQL, AzureResourceFunction, AzureResourceApim],
//     default: [],
// };

export function createAddAzureResourceQuestion(alreadyHaveFunction: boolean, alreadhHaveSQL: boolean, alreadyHaveAPIM: boolean): MultiSelectQuestion {
    const options:OptionItem[] = [AzureResourceFunction];
    if(!alreadhHaveSQL) options.push(AzureResourceSQL);
    if(!alreadyHaveAPIM) options.push(AzureResourceApim);
    return {
        name: AzureSolutionQuestionNames.AddResources,
        title: "Select Azure resources to add",
        type: NodeType.multiSelect,
        option: options,
        default: [],
        onDidChangeSelection:async function(selectedItems: OptionItem[]) : Promise<string[]>{
            const hasSQL = selectedItems.some(i=>i.id === AzureResourceSQL.id);
            const hasAPIM = selectedItems.some(i=>i.id === AzureResourceApim.id);
            const ids = selectedItems.map(i=>i.id);
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
    if(!alreadyHaveBot) options.push(BotOptionItem);
    return {
        name: AzureSolutionQuestionNames.AddCapabilities,
        title: "Select Capabilities to add",
        type: NodeType.multiSelect,
        option: options,
        default: []
    };
}

export const DeployPluginSelectQuestion: MultiSelectQuestion = {
    name: AzureSolutionQuestionNames.PluginSelectionDeploy,
    title: `Please select which resource(s) to deploy`,
    type: NodeType.multiSelect,
    option: [],
    default: []
};


export const AskSubscriptionQuestion: FuncQuestion = {
    name: AzureSolutionQuestionNames.AskSub,
    type: NodeType.func,
    namespace: "fx-solution-azure",
    method: "askSubscription"
};