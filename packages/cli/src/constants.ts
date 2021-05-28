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
  title: "Select root folder of the project",
  default: "./",
});

export const SubscriptionNode = new QTreeNode({
  type: NodeType.text,
  name: "subscription",
  title: "Select a subscription",
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
    description: "Todo List app with Azure Function backend and Azure SQL database",
    sampleAppName: "todo-list-with-Azure-backend",
    sampleAppUrl: "https://github.com/OfficeDev/TeamsFx-Samples/archive/refs/heads/main.zip",
  },
  {
    tags: ["SharePoint", "SPFx", "TS"],
    title: "Todo List with SPFx ",
    description: "Todo List app hosting on SharePoint",
    sampleAppName: "todo-list-SPFx",
    sampleAppUrl: "https://github.com/OfficeDev/TeamsFx-Samples/archive/refs/heads/main.zip",
  },
  {
    tags: ["Tab", "Message Extension", "TS"],
    title: "Share Now",
    description: "Knowledge sharing app contains a Tab and a Message Extension",
    sampleAppName: "share-now",
    sampleAppUrl: "https://github.com/OfficeDev/TeamsFx-Samples/archive/refs/heads/main.zip",
  },
  {
    tags: ["Meeting extension", "JS"],
    title: "In-meeting App",
    description: "A template for apps using only in the context of a Teams meeting",
    sampleAppName: "in-meeting-app",
    sampleAppUrl: "https://github.com/OfficeDev/TeamsFx-Samples/archive/refs/heads/main.zip",
  },
];

export enum CLILogLevel {
  error = 0,
  verbose,
  debug,
}
