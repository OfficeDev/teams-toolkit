// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { MultiSelectQuestion, SingleSelectQuestion } from "@microsoft/teamsfx-api";
import { BotOptionItem, MessageExtensionItem, TabOptionItem } from "../fx-solution/question";

export enum SolutionV3QuestionNames {
  capabilities = "capabilities",
  feature = "feature",
  plugins = "plugins",
}

export const selectSingleFeatureQuestion: SingleSelectQuestion = {
  name: SolutionV3QuestionNames.feature,
  title: "Select a feature to add",
  type: "singleSelect",
  staticOptions: [],
};

export const selectMultiPluginsQuestion: MultiSelectQuestion = {
  name: SolutionV3QuestionNames.plugins,
  title: "Select plugins to deploy",
  type: "multiSelect",
  staticOptions: [],
};

export const selectCapabilitiesQuestion: MultiSelectQuestion = {
  name: SolutionV3QuestionNames.capabilities,
  title: "Select capabilities",
  type: "multiSelect",
  staticOptions: [TabOptionItem, BotOptionItem, MessageExtensionItem],
  default: [TabOptionItem.id],
  skipSingleOption: true,
};
