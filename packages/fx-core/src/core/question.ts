// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FileQuestion, NodeType, OptionItem, Question, SingleSelectQuestion, TextInputQuestion } from "fx-api";

export enum CoreQuestionNames {
    AppName = "app-name",
    Foler = "folder",
    Solution = "solution",
    CreateFromScratch = "scratch",
    Samples = "samples",
    Stage = "stage",
    SubStage = "substage",
}

export const QuestionAppName: TextInputQuestion = {
    type: NodeType.text,
    name: CoreQuestionNames.AppName,
    title: "Project name",
    validation: {
        namespace: "",
        method: "validateAppName",
    },
    placeholder: "Application name"
};

export const QuestionRootFolder: FileQuestion = {
    type: NodeType.folder,
    name: CoreQuestionNames.Foler,
    title: "Workspace folder"
};

export const QuestionSelectSolution: SingleSelectQuestion = {
    type: NodeType.singleSelect,
    name: CoreQuestionNames.Solution,
    title: "Select a solution",
    option: [],
    skipSingleOption: true
};

export const ScratchOptionYes:OptionItem = {
    id:"yes",
    label: "$(file) Create a new Teams app",
    detail: "Use the Teams Toolkit to create a new application."
};

export const ScratchOptionNo:OptionItem = {
    id:"no",
    label: "$(search) Start from a sample",
    detail: "Use an existing sample as a starting point for your new application."
};

export const ScratchOrSampleSelect: SingleSelectQuestion = {
    type: NodeType.singleSelect,
    name: CoreQuestionNames.CreateFromScratch,
    title: "Teams Toolkit: Create a new Teams app",
    option: [ScratchOptionYes,ScratchOptionNo],
    default: ScratchOptionYes.id,
    placeholder: "Select an option",
    skipSingleOption: true
};

export const SampleSelect: SingleSelectQuestion = {
    type: NodeType.singleSelect,
    name: CoreQuestionNames.Samples,
    title: "Start from a sample",
    option: [{
        id:"to-do-list",
        label: "To Do List",
        detail: "Sample app description goes here",
        data: "https://github.com/HuihuiWu-Microsoft/Sample-app-graph/releases/download/v1.0/sample.app.graph.zip"
    },{
        id:"to-do-list2",
        label: "To Do List2",
        detail: "Sample app description goes here",
        data: "https://github.com/HuihuiWu-Microsoft/Sample-app-graph/releases/download/v1.0/sample.app.graph.zip"
    }],
    placeholder: "Select a sample",
    returnObject:true
};
