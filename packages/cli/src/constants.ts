// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as path from "path";

import { NodeType, QTreeNode } from "@microsoft/teamsfx-api";

export const cliSource = "TeamsfxCLI";
export const cliName = "teamsfx";
export const cliTelemetryPrefix = "teamsfx-cli";

export const paramFolder = path.resolve(__dirname, "../resource");
export const newParamPath = path.resolve(paramFolder, "newParam.json");

export const resourceAddSqlParamPath = path.resolve(paramFolder, "resourceAddSqlParam.json");
export const resourceAddFunctionParamPath = path.resolve(
  paramFolder,
  "resourceAddFunctionParam.json"
);
export const resourceAddApimParamPath = path.resolve(paramFolder, "resourceAddApimParam.json");

export const capabilityAddTabParamPath = path.resolve(paramFolder, "capabilityAddTabParam.json");
export const capabilityAddBotParamPath = path.resolve(paramFolder, "capabilityAddBotParam.json");
export const capabilityAddMessageExtensionParamPath = path.resolve(
  paramFolder,
  "capabilityAddMessageExtensionParam.json"
);
export const resourceListParamPath = path.resolve(paramFolder, "resourceListParam.json");
export const resourceShowFunctionParamPath = path.resolve(
  paramFolder,
  "resourceShowFunctionParam.json"
);
export const resourceShowSQLParamPath = path.resolve(paramFolder, "resourceShowSQLParam.json");

export const provisionParamPath = path.resolve(paramFolder, "provisionParam.json");
export const deployParamPath = path.resolve(paramFolder, "deployParam.json");
export const publishParamPath = path.resolve(paramFolder, "publishParam.json");
export const buildParamPath = path.resolve(paramFolder, "buildParam.json");
export const validateParamPath = path.resolve(paramFolder, "validateParam.json");

export const RootFolderNode = new QTreeNode({
  type: NodeType.folder,
  name: "folder",
  description: "Select root folder of the project",
  default: "./",
});

export const SubscriptionNode = new QTreeNode({
  type: NodeType.text,
  name: "subscription",
  description: "Select a subscription",
});

export const templates: {
  tags: string[];
  title: string;
  description: string;
  sampleAppName: string;
  sampleAppUrl: string;
}[] = [
  {
    tags: ["React", "Azure function", "Azure SQL", "JS"],
    title: "Todo List with Azure backend",
    description: "Todo List provides an easy way to manage to-do items in Teams Client. This app helps enabling task collaboration and management for your team. The frontend is a React app and the backend is hosted on Azure. You will need an Azure subscription to run the app.",
    sampleAppName: "todo-list-with-Azure-backend",
    sampleAppUrl: "https://github.com/OfficeDev/TeamsFx-Samples/archive/refs/heads/main.zip"
  },
  {
    tags: ["SharePoint", "SPFx", "TS"],
    title: "Todo List with SPFx ",
    description: "Todo List with SPFx is a Todo List for individuals to manage his/her personal to-do items. This app is hosted on Sharepoint. There is no requirements to deploy Azure resources.",
    sampleAppName: "todo-list-SPFx",
    sampleAppUrl: "https://github.com/OfficeDev/TeamsFx-Samples/archive/refs/heads/main.zip"
  },
  {
    tags: ["Tab", "Message Extension", "TS"],
    title: "Share Now",
    description: "Share Now promotes the exchange of information between colleagues by enabling users to share content within the Teams environment. Users engage the app to share items of interest, discover new shared content, set preferences, and bookmark favorites for later reading.",
    sampleAppName: "share-now",
    sampleAppUrl: "https://github.com/OfficeDev/TeamsFx-Samples/archive/refs/heads/main.zip"
  },
  {
    tags: ["Easy QnA", "Bot", "JS"],
    title: "FAQ Plus",
    description: "FAQ Plus is a conversational Q&A bot providing an easy way to answer frequently asked questions by users. One can ask a question and the bot responds with information in the knowledge base. If the answer is not in the knowledge base, the bot submits the question to a pre-configured team of experts who help provide support.",
    sampleAppName: "faq-plus",
    sampleAppUrl: "https://github.com/OfficeDev/TeamsFx-Samples/archive/refs/heads/main.zip"
  },
  {
    tags: ["Meeting extension", "JS"],
    title: "In-meeting App",
    description: "In-meeting app is a hello-world template which shows how to build an app in the context of a Teams meeting. This is a hello-world sample which does not provide any functional feature. This app contains a side panel and a Bot which only shows user profile and can only be added to a Teams meeting.",
    sampleAppName: "in-meeting-app",
    sampleAppUrl: "https://github.com/OfficeDev/TeamsFx-Samples/archive/refs/heads/main.zip"
  }
];

export enum CLILogLevel {
  error = 0,
  verbose,
  debug,
}
