// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs, IQTreeNode, OptionItem, Platform } from "@microsoft/teamsfx-api";
import { getLocalizedString } from "../common/localizeUtils";
import { defaultGenerator } from "../component/generator/templates/templateGenerator";
import { getRuntime, ProjectTypeOptions, QuestionNames, RuntimeOptions } from "./constants";
import { appNameQuestion, folderQuestion } from "./create";
import { featureFlagManager, FeatureFlags } from "../common/featureFlags";
import { TemplateNames } from "./templates";

function onDidSelectionCapability(selected: string | OptionItem, inputs: Inputs): void {
  if ((selected as OptionItem).data) {
    inputs[QuestionNames.TemplateName] = (selected as OptionItem).data as string;
  }
}

export function createNewNode(): IQTreeNode {
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
          dynamicOptions: (inputs: Inputs) => {
            const options: OptionItem[] = [];
            options.push(ProjectTypeOptions.Agent(inputs.platform));
            if (getRuntime(inputs) === RuntimeOptions.NodeJS().id) {
              options.push(ProjectTypeOptions.customCopilot(inputs.platform));
            }
            options.push(
              ProjectTypeOptions.bot(inputs.platform),
              ProjectTypeOptions.tab(inputs.platform),
              ProjectTypeOptions.me(inputs.platform)
            );
            if (getRuntime(inputs) === RuntimeOptions.NodeJS().id) {
              if (featureFlagManager.getBooleanValue(FeatureFlags.OfficeMetaOS)) {
                options.push(ProjectTypeOptions.officeMetaOS(inputs.platform));
              } else if (featureFlagManager.getBooleanValue(FeatureFlags.OfficeAddin)) {
                options.push(ProjectTypeOptions.officeAddin(inputs.platform));
              } else {
                options.push(ProjectTypeOptions.outlookAddin(inputs.platform));
              }
            }
            return options;
          },
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
          dynamicOptions: (inputs: Inputs) => [
            CapabilityOptions.basicBot(),
            CapabilityOptions.notificationBot(),
            CapabilityOptions.commandBot(),
            CapabilityOptions.workflowBot(inputs),
          ],
          placeholder: getLocalizedString("core.createCapabilityQuestion.placeholder"),
          onDidSelection: onDidSelectionCapability,
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
          staticOptions: [
            [
              CapabilityOptions.nonSsoTab(),
              CapabilityOptions.m365SsoLaunchPage(),
              CapabilityOptions.dashboardTab(),
              CapabilityOptions.SPFxTab(),
            ],
          ],
          placeholder: getLocalizedString("core.createCapabilityQuestion.placeholder"),
          onDidSelection: onDidSelectionCapability,
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
          onDidSelection: onDidSelectionCapability,
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

export class CapabilityOptions {
  static basicBot(): OptionItem {
    return {
      id: "bot",
      label: `${getLocalizedString("core.BotNewUIOption.label")}`,
      detail: getLocalizedString("core.BotNewUIOption.detail"),
      data: TemplateNames.DefaultBot,
    };
  }
  static notificationBot(): OptionItem {
    return {
      // For default option, id and cliName must be the same
      id: "notification",
      label: `${getLocalizedString("core.NotificationOption.label")}`,
      detail: getLocalizedString("core.NotificationOption.detail"),
      buttons: [
        {
          iconPath: "file-symlink-file",
          tooltip: getLocalizedString("core.option.github"),
          command: "fx-extension.openTutorial",
        },
      ],
    };
  }
  static commandBot(): OptionItem {
    return {
      // id must match cli `yargsHelp`
      id: "command-bot",
      label: `${getLocalizedString("core.CommandAndResponseOption.label")}`,
      detail: getLocalizedString("core.CommandAndResponseOption.detail"),
      data: TemplateNames.CommandAndResponse,
      buttons: [
        {
          iconPath: "file-symlink-file",
          tooltip: getLocalizedString("core.option.github"),
          command: "fx-extension.openTutorial",
        },
      ],
    };
  }

  static workflowBot(inputs?: Inputs): OptionItem {
    const item: OptionItem = {
      id: "workflow-bot",
      label: `${getLocalizedString("core.WorkflowOption.label")}`,
      detail: getLocalizedString("core.WorkflowOption.detail"),
      data: TemplateNames.Workflow,
      buttons: [
        {
          iconPath: "file-symlink-file",
          tooltip: getLocalizedString("core.option.github"),
          command: "fx-extension.openTutorial",
        },
      ],
    };
    return item;
  }

  static nonSsoTab(): OptionItem {
    return {
      id: "tab-non-sso",
      label: `${getLocalizedString("core.TabNonSso.label")}`,
      detail: getLocalizedString("core.TabNonSso.detail"),
      description: getLocalizedString(
        "core.createProjectQuestion.option.description.worksInOutlookM365"
      ),
      data: TemplateNames.Tab,
    };
  }

  static m365SsoLaunchPage(): OptionItem {
    return {
      id: "sso-launch-page",
      label: `${getLocalizedString("core.M365SsoLaunchPageOptionItem.label")}`,
      detail: getLocalizedString("core.M365SsoLaunchPageOptionItem.detail"),
      description: getLocalizedString(
        "core.createProjectQuestion.option.description.worksInOutlookM365"
      ),
      data: TemplateNames.SsoTabObo,
    };
  }

  static dashboardTab(): OptionItem {
    return {
      id: "dashboard-tab",
      label: `${getLocalizedString("core.DashboardOption.label")}`,
      detail: getLocalizedString("core.DashboardOption.detail"),
      description: getLocalizedString(
        "core.createProjectQuestion.option.description.worksInOutlookM365"
      ),
      data: TemplateNames.DashboardTab,
      buttons: [
        {
          iconPath: "file-symlink-file",
          tooltip: getLocalizedString("core.option.github"),
          command: "fx-extension.openTutorial",
        },
      ],
    };
  }

  static SPFxTab(): OptionItem {
    return {
      id: "tab-spfx",
      label: getLocalizedString("core.TabSPFxOption.labelNew"),
      description: getLocalizedString(
        "core.createProjectQuestion.option.description.worksInOutlookM365"
      ),
      detail: getLocalizedString("core.TabSPFxOption.detailNew"),
    };
  }
}
