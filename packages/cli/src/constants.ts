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
  title: string;
  description: string;
  sampleAppName: string;
  sampleAppUrl: string;
}[] = [
  {
    title: "In-meeting App",
    sampleAppName: "in-meeting-app",
    description:
      "In-meeting app is a hello-world template which shows how to build an app working in the context of a Teams meeting. ",
    sampleAppUrl: "https://github.com/OfficeDev/TeamsFx-Samples/archive/refs/heads/main.zip",
  },
  {
    title: "Todo List with backend on Azure",
    sampleAppName: "todo-list-with-Azure-backend",
    description: "Todo List provides easy way to manage to-do items in Teams Client.",
    sampleAppUrl: "https://github.com/OfficeDev/TeamsFx-Samples/archive/refs/heads/main.zip",
  },
  {
    title: "Todo List with SPFx",
    sampleAppName: "todo-list-SPFx",
    description:
      "Todo List with SPFx is a Todo List for individual user to manage his/her personal to-do items in the format of an app installed on Teams client.",
    sampleAppUrl: "https://github.com/OfficeDev/TeamsFx-Samples/archive/refs/heads/main.zip",
  },
  {
    title: "Share Now",
    sampleAppName: "share-now",
    description:
      "The Share Now promotes the exchange of information between colleagues by enabling users to share content within the Teams environment. ",
    sampleAppUrl: "https://github.com/OfficeDev/TeamsFx-Samples/archive/refs/heads/main.zip",
  },
  {
    title: "FAQ Plus",
    sampleAppName: "faq-plus",
    description:
      "FAQ Plus is a conversational Q&A bot providing an easy way to answer frequently asked questions by users. ",
    sampleAppUrl: "https://github.com/OfficeDev/TeamsFx-Samples/archive/refs/heads/main.zip",
  },
];

export enum CLILogLevel {
  error = 0,
  verbose,
  debug,
}
