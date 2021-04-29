// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as path from "path";

import { NodeType, QTreeNode } from "fx-api";

export const cliSource = "TeamsfxCLI";
export const cliName = "teamsfx";

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
export const capabilityAddMessageExtensionParamPath = path.resolve(paramFolder, "capabilityAddMessageExtensionParam.json");
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
export const testParamPath = path.resolve(paramFolder, "testParam.json");

export const RootFolderNode = new QTreeNode({
  type: NodeType.folder,
  name: "folder",
  description: "Select root folder of the project",
  default: "./"
});

export const SubscriptionNode = new QTreeNode({
  type: NodeType.text,
  name: "subscription",
  description: "Select a subscription"
});

export const templates: {
  tags: string[],
  title: string,
  description: string,
  sampleAppName: string,
  sampleAppUrl: string
}[] = [
  {
    tags: ["Launch Page", "TS"],
    title: "To Do List (for test)",
    description: "Sample app description goes here (for test)",
    sampleAppName: "todolist",
    sampleAppUrl: "https://github.com/HuihuiWu-Microsoft/Sample-app-graph/releases/download/v1.0/sample.app.graph.zip"
  }
];

export enum CLILogLevel {
  error = 0,
  verbose,
  debug
}
