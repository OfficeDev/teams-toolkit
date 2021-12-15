// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  MultiSelectQuestion,
  OptionItem,
  QTreeNode,
  SingleSelectQuestion,
  v3,
} from "@microsoft/teamsfx-api";
import { BotOptionItem, MessageExtensionItem, TabOptionItem } from "../question";

export enum SolutionV3QuestionNames {
  scaffoldTemplate = "template",
  capabilities = "capabilities",
  resource = "resource",
  module = "module",
}

export const selectModulesQuestion: SingleSelectQuestion = {
  name: SolutionV3QuestionNames.module,
  title: "Select a module",
  type: "singleSelect",
  staticOptions: [],
};

export function createSelectModuleQuestionNode(modules: v3.Module[]): QTreeNode {
  const moduleNode = new QTreeNode(selectModulesQuestion);
  const moduleOptions: OptionItem[] = [];
  let i = 0;
  for (const module of modules) {
    const option: OptionItem = {
      id: `${i++}`,
      label: JSON.stringify(module),
    };
    moduleOptions.push(option);
  }
  moduleOptions.push({ id: "none", label: "none" });
  selectModulesQuestion.staticOptions = moduleOptions;
  return moduleNode;
}

export const selectCapabilitiesQuestion: MultiSelectQuestion = {
  name: SolutionV3QuestionNames.capabilities,
  title: "Select capabilities",
  type: "multiSelect",
  staticOptions: [TabOptionItem, BotOptionItem, MessageExtensionItem],
  default: [TabOptionItem.id],
  skipSingleOption: true,
};

export const selectScaffoldTemplateQuestion: SingleSelectQuestion = {
  name: SolutionV3QuestionNames.scaffoldTemplate,
  title: "Select a scaffold template",
  type: "singleSelect",
  staticOptions: [],
  returnObject: true,
};

export const selectResourceQuestion: SingleSelectQuestion = {
  name: SolutionV3QuestionNames.resource,
  title: "Select a resources",
  type: "singleSelect",
  staticOptions: [],
};
