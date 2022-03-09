// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { MultiSelectQuestion } from "@microsoft/teamsfx-api";
import { BotOptionItem, MessageExtensionItem, TabOptionItem } from "../../../core/question";

export enum SolutionV3QuestionNames {
  capabilities = "capabilities",
  features = "features",
  plugins = "plugins",
}

export const selectMultipleFeaturesQuestion: MultiSelectQuestion = {
  name: SolutionV3QuestionNames.features,
  title: "Select features to add",
  type: "multiSelect",
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
