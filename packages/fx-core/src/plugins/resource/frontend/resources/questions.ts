// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { NodeType, QTreeNode } from "fx-api";
import { TabLanguage } from "./templateInfo";

export class QuestionKey {
    static readonly TabLanguage = "TabLanguage";
}

export const tabLanguageQuestion = new QTreeNode({
    name: QuestionKey.TabLanguage,
    description: "Select language for tab frontend project",
    type: NodeType.singleSelect,
    option: [TabLanguage.JavaScript, TabLanguage.TypeScript],
});
