// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FuncValidation, NodeType, QTreeNode } from "teamsfx-api";
import { Constants } from "./constants";

export const adminNameQuestion = new QTreeNode({
    name: Constants.questionKey.adminName,
    description: Constants.userQuestion.adminName,
    type: NodeType.text,
    validation: {
        namespace: `${Constants.solutionPluginFullName}/${Constants.pluginFullName}`,
        method: Constants.questionKey.adminName
    } as FuncValidation
});

export const adminPasswordQuestion = new QTreeNode({
    name: Constants.questionKey.adminPassword,
    description: Constants.userQuestion.adminPassword,
    type: NodeType.password,
    validation: {
        namespace: `${Constants.solutionPluginFullName}/${Constants.pluginFullName}`,
        method: Constants.questionKey.adminPassword
    } as FuncValidation
});

export const confirmPasswordQuestion = new QTreeNode({
    name: Constants.questionKey.confirmPassword,
    description: Constants.userQuestion.confirmPassword,
    type: NodeType.password,
    validation: {
        namespace: `${Constants.solutionPluginFullName}/${Constants.pluginFullName}`,
        method: Constants.questionKey.confirmPassword
    } as FuncValidation
});
