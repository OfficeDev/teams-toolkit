// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs, IQTreeNode, OptionItem, Platform } from "@microsoft/teamsfx-api";
import { getLocalizedString } from "../common/localizeUtils";
import { defaultGenerator } from "../component/generator/templates/templateGenerator";
import { CapabilityOptions, ProjectTypeOptions, QuestionNames } from "./constants";
import { appNameQuestion, folderQuestion } from "./create";

function onDidSelectionCategory(selected: string | OptionItem, inputs: Inputs): void {
  if ((selected as OptionItem).data) {
    inputs[QuestionNames.TemplateName] = (selected as OptionItem).data as string;
  }
}

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
          onDidSelection: onDidSelectionCategory,
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
          onDidSelection: onDidSelectionCategory,
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
          onDidSelection: onDidSelectionCategory,
        },
      },
      defaultGenerator.getQuestionNode(), // question node defined by generator
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

export function createNewAgentNode(): IQTreeNode {
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
            ProjectTypeOptions.Agent(inputs.platform),
            ProjectTypeOptions.customCopilot(inputs.platform),
          ],
        },
        cliOptionDisabled: "self",
      },
      // category level 2
      {
        // Agent
        condition: (inputs: Inputs) =>
          inputs[QuestionNames.ProjectType] === ProjectTypeOptions.Agent().id,
        data: {
          name: QuestionNames.Capabilities,
          title: getLocalizedString(
            "core.createProjectQuestion.projectType.copilotExtension.title"
          ),
          type: "singleSelect",
          staticOptions: CapabilityOptions.agents(),
          placeholder: getLocalizedString(
            "core.createProjectQuestion.projectType.copilotExtension.placeholder"
          ),
        },
      },
      {
        // customCopilot
        condition: (inputs: Inputs) =>
          inputs[QuestionNames.ProjectType] === ProjectTypeOptions.customCopilot().id,
        data: {
          name: QuestionNames.Capabilities,
          title: getLocalizedString("core.createProjectQuestion.projectType.customCopilot.title"),
          type: "singleSelect",
          staticOptions: CapabilityOptions.customCopilots(),
          placeholder: getLocalizedString(
            "core.createProjectQuestion.projectType.customCopilot.placeholder"
          ),
        },
      },
      defaultGenerator.getQuestionNode(), // question node defined by generator
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
