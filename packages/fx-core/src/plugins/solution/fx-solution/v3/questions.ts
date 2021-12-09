// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { MultiSelectQuestion, SingleSelectQuestion } from "@microsoft/teamsfx-api";
import { BotOptionItem, MessageExtensionItem, TabOptionItem } from "../question";

export enum SolutionV3QuestionNames {
  scaffoldTemplate = "scaffold-template",
  capabilities = "capabilities",
  addResources = "add-resources",
  moduleIndex = "module-index",
}

export const capabilitiesQuestion: MultiSelectQuestion = {
  name: SolutionV3QuestionNames.capabilities,
  title: "Select capabilities",
  type: "multiSelect",
  staticOptions: [TabOptionItem, BotOptionItem, MessageExtensionItem],
  default: [TabOptionItem.id],
};

export const scaffoldTemplatesQuestion: SingleSelectQuestion = {
  name: SolutionV3QuestionNames.scaffoldTemplate,
  title: "Select a scaffold template",
  type: "singleSelect",
  staticOptions: [],
  returnObject: true,
};

export const addResourcesQuestion: MultiSelectQuestion = {
  name: SolutionV3QuestionNames.addResources,
  title: "Select resources",
  type: "multiSelect",
  staticOptions: [],
};
