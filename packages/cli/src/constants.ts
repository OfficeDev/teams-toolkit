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
export const resourceListParamPath = path.resolve(paramFolder, "resourceListParam.json");
export const resourceShowFunctionParamPath = path.resolve(
  paramFolder,
  "resourceShowFunctionParam.json"
);
export const resourceShowSQLParamPath = path.resolve(paramFolder, "resourceShowSQLParam.json");
export const resourceConfigureAadParamPath = path.resolve(
  paramFolder,
  "resourceConfigureAadParam.json"
);

export const provisionParamPath = path.resolve(paramFolder, "provisionParam.json");
export const deployParamPath = path.resolve(paramFolder, "deployParam.json");

export const RootFolderNode = new QTreeNode({
  type: NodeType.folder,
  name: "folder",
  description: "Select root folder of the project",
  default: "./"
});

export const SqlUsernameNode = new QTreeNode({
  type: NodeType.text,
  name: "sql-username",
  description: "Admin name of SQL"
});

export const SqlPasswordNode = new QTreeNode({
  type: NodeType.text,
  name: "sql-password",
  description: "Admin password of SQL"
});

export const SubscriptionNode = new QTreeNode({
  type: NodeType.text,
  name: "subscription",
  description: "Please select a subscription"
});

export const DeployedPluginNode = new QTreeNode({
  type: NodeType.multiSelect,
  name: "deploy-plugin",
  description: "Which resources do you want to deploy",
  option: ["frontend", "azure-function", "spfx"],
  default: ["frontend"]
});

export enum CLILogLevel {
  error = 0,
  verbose,
  debug
}
