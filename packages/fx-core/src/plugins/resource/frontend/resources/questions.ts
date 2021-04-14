// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { NodeType, QTreeNode } from "fx-api";

export class QuestionKey {
    static readonly TabLanguage = "programming-language";
    static readonly TabScope = "TabScope";
}

export class TabScope {
    static readonly PersonalTab = "personal tab";
    static readonly GroupTab = "group tab";
}

export const tabScopeQuestion = new QTreeNode({
    name: QuestionKey.TabScope,
    description: "Select tab scope",
    type: NodeType.singleSelect,
    option: [TabScope.PersonalTab, TabScope.GroupTab],
    default: TabScope.PersonalTab,
});
