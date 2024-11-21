// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs, IQTreeNode, Platform } from "@microsoft/teamsfx-api";
import { CapabilityOptions, ProjectTypeOptions, QuestionNames } from "./constants";
import { getLocalizedString } from "../common/localizeUtils";
import { DefaultTemplateGenerator } from "../component/generator/templates/templateGenerator";
import { appNameQuestion, folderQuestion } from "./create";

export function createNewM365Node(): IQTreeNode {
  const node: IQTreeNode = {
    data: { type: "group" },
    children: [
      // category level 1
      {
        condition: (inputs: Inputs) =>
          inputs.platform === Platform.VSCode || inputs.platform === Platform.CLI,
        data: {
          name: QuestionNames.ProjectType,
          title: getLocalizedString("core.createProjectQuestion.title"),
          type: "singleSelect",
          staticOptions: [],
          dynamicOptions: (inputs: Inputs) => [
            ProjectTypeOptions.bot(inputs.platform),
            ProjectTypeOptions.tab(inputs.platform),
            ProjectTypeOptions.me(inputs.platform),
          ],
        },
        cliOptionDisabled: "self",
      },
      // category level 2
      {
        // Bot sub tree
        condition: (inputs: Inputs) =>
          inputs[QuestionNames.ProjectType] === ProjectTypeOptions.bot().id,
        data: {
          name: QuestionNames.Capabilities,
          title: getLocalizedString("core.createProjectQuestion.projectType.bot.title"),
          type: "singleSelect",
          staticOptions: [],
          dynamicOptions: (inputs: Inputs) => CapabilityOptions.bots(inputs),
          placeholder: getLocalizedString("core.createCapabilityQuestion.placeholder"),
        },
      },
      {
        // Tab sub tree
        condition: (inputs: Inputs) =>
          inputs[QuestionNames.ProjectType] === ProjectTypeOptions.tab().id,
        data: {
          name: QuestionNames.Capabilities,
          title: getLocalizedString("core.createProjectQuestion.projectType.tab.title"),
          type: "singleSelect",
          staticOptions: CapabilityOptions.tabs(),
          placeholder: getLocalizedString("core.createCapabilityQuestion.placeholder"),
        },
      },
      {
        // Messaging Extension sub tree
        condition: (inputs: Inputs) =>
          inputs[QuestionNames.ProjectType] === ProjectTypeOptions.me().id,
        data: {
          name: QuestionNames.Capabilities,
          title: getLocalizedString(
            "core.createProjectQuestion.projectType.messageExtension.title"
          ),
          type: "singleSelect",
          staticOptions: CapabilityOptions.mes(),
          placeholder: getLocalizedString("core.createCapabilityQuestion.placeholder"),
        },
      },
      new DefaultTemplateGenerator().getQuestionNode()!, // question node defined by generator
      {
        // root folder
        data: folderQuestion(),
      },
      {
        // app name
        data: appNameQuestion(),
      },
    ],
  };
  return node;
}
