// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { NodeType, QTreeNode, Question } from "fx-api";
import { FrontendConfigInfo, QuestionDescription, QuestionKey, TabScope } from "../constants";

export interface FrontendQuestionGroup {
    question: Question,
    configKey: string,
}

export class FrontendQuestion {
    question: QTreeNode;
    configKey: string;
    questionKey: string;
    defaultValue: any;

    constructor(data: FrontendQuestionGroup) {
        this.question = new QTreeNode(data.question);
        this.configKey = data.configKey;
        this.questionKey = data.question.name;
        this.defaultValue = data.question.default;
    }
}

export const tabScopeQuestion: Question = {
    name: QuestionKey.TabScopes,
    description: QuestionDescription.TabScopes,
    type: NodeType.multiSelect,
    option: [TabScope.PersonalTab, TabScope.GroupTab],
    default: [TabScope.PersonalTab],
};

export const FrontendQuestionsOnScaffold = [
    new FrontendQuestion({ question: tabScopeQuestion, configKey: FrontendConfigInfo.TabScopes })
];
