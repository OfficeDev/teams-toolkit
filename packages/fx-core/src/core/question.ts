// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ConfigMap, FileQuestion, NodeType, OptionItem, Question, SingleSelectQuestion, TextInputQuestion } from "fx-api";
import * as jsonschema from "jsonschema";
import * as path from "path";
import * as fs from "fs-extra";

export enum CoreQuestionNames {
    AppName = "app-name",
    Foler = "folder",
    Solution = "solution",
    CreateFromScratch = "scratch",
    Samples = "samples",
    Stage = "stage",
    SubStage = "substage",
}

export const ProjectNamePattern:string = "^[a-zA-Z][\\da-zA-Z]+$";

export const QuestionAppName: TextInputQuestion = {
    type: NodeType.text,
    name: CoreQuestionNames.AppName,
    title: "Project name",
    validation: {
        validFunc: async (appName: string, answer?: ConfigMap): Promise<string|undefined> => {
            const folder = answer?.getString(CoreQuestionNames.Foler);
            if(!folder) return undefined;
            const schema = {
                pattern: ProjectNamePattern,
            };
            const validateResult = jsonschema.validate(appName, schema);
            if (validateResult.errors && validateResult.errors.length > 0) {
                return `project name doesn't match pattern: ${schema.pattern}`;
            }
            const projectPath = path.resolve(folder, appName);
            const exists = await fs.pathExists(projectPath);
            if (exists) return `Project path already exists:${projectPath}, please change a different project name.`;
            return undefined;
        }
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
    label: "$(new-folder) Create a new Teams app",
    detail: "Use the Teams Toolkit to create a new application."
};

export const ScratchOptionNo:OptionItem = {
    id:"no",
    label: "$(heart) Start from a sample",
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
