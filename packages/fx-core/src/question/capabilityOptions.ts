// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs, OptionItem, Platform } from "@microsoft/teamsfx-api";
import { getLocalizedString } from "../common/localizeUtils";
import {
  FeatureFlags,
  featureFlagManager,
  isApiCopilotPluginEnabled,
  isCLIDotNetEnabled,
  isCopilotPluginEnabled,
  isTdpTemplateCliTestEnabled,
} from "../common/featureFlags";
import {
  RuntimeOptions,
  copilotPluginApiSpecOptionId,
  copilotPluginNewApiOptionId,
  copilotPluginOpenAIPluginOptionId,
} from "./constants";
import { QuestionNames } from "./questionNames";
import { OfficeAddinProjectConfig } from "../component/generator/officeXMLAddin/projectConfig";
import { OfficeAddinHostOptions, ProjectTypeOptions } from "./create";

export function getRuntime(inputs: Inputs): string {
  let runtime = RuntimeOptions.NodeJS().id;
  if (isCLIDotNetEnabled()) {
    runtime = inputs[QuestionNames.Runtime] || runtime;
  } else {
    if (inputs?.platform === Platform.VS) {
      runtime = RuntimeOptions.DotNet().id;
    }
  }
  return runtime;
}

export class CapabilityOptions {
  // bot
  static basicBot(): OptionItem {
    return {
      id: "bot",
      label: `${getLocalizedString("core.BotNewUIOption.label")}`,
      detail: getLocalizedString("core.BotNewUIOption.detail"),
    };
  }
  static notificationBot(): OptionItem {
    return {
      // For default option, id and cliName must be the same
      id: "notification",
      label: `${getLocalizedString("core.NotificationOption.label")}`,
      detail: getLocalizedString("core.NotificationOption.detail"),
      data: "https://aka.ms/teamsfx-send-notification",
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
      data: "https://aka.ms/teamsfx-create-command",
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
      // id must match cli `yargsHelp`
      id: "workflow-bot",
      label: `${getLocalizedString("core.WorkflowOption.label")}`,
      detail: getLocalizedString("core.WorkflowOption.detail"),
      data: "https://aka.ms/teamsfx-create-workflow",
      buttons: [
        {
          iconPath: "file-symlink-file",
          tooltip: getLocalizedString("core.option.github"),
          command: "fx-extension.openTutorial",
        },
      ],
    };
    if (inputs?.inProductDoc) {
      item.data = "cardActionResponse";
      item.buttons = [
        {
          iconPath: "file-code",
          tooltip: getLocalizedString("core.option.inProduct"),
          command: "fx-extension.openTutorial",
        },
      ];
    }
    return item;
  }

  //tab

  static nonSsoTab(): OptionItem {
    return {
      id: "tab-non-sso",
      label: `${getLocalizedString("core.TabNonSso.label")}`,
      detail: getLocalizedString("core.TabNonSso.detail"),
      description: getLocalizedString(
        "core.createProjectQuestion.option.description.worksInOutlookM365"
      ),
    };
  }

  static tab(): OptionItem {
    return {
      id: "tab",
      label: getLocalizedString("core.TabOption.label"),
      description: getLocalizedString("core.TabOption.description"),
      detail: getLocalizedString("core.TabOption.detail"),
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
      data: "https://aka.ms/teamsfx-dashboard-app",
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

  //message extension
  static linkUnfurling(): OptionItem {
    return {
      id: "link-unfurling",
      label: `${getLocalizedString("core.LinkUnfurlingOption.label")}`,
      detail: getLocalizedString("core.LinkUnfurlingOption.detail"),
      description: getLocalizedString(
        "core.createProjectQuestion.option.description.worksInOutlook"
      ),
    };
  }

  static m365SearchMe(): OptionItem {
    return {
      id: "search-app",
      label: `${getLocalizedString("core.M365SearchAppOptionItem.label")}`,
      detail: isCopilotPluginEnabled()
        ? getLocalizedString("core.M365SearchAppOptionItem.copilot.detail")
        : getLocalizedString("core.M365SearchAppOptionItem.detail"),
    };
  }

  static SearchMe(): OptionItem {
    return {
      id: "search-message-extension",
      label: `${getLocalizedString("core.M365SearchAppOptionItem.label")}`,
      detail: getLocalizedString("core.SearchAppOptionItem.detail"),
    };
  }

  static collectFormMe(): OptionItem {
    return {
      id: "collect-form-message-extension",
      label: `${getLocalizedString("core.MessageExtensionOption.labelNew")}`,
      detail: getLocalizedString("core.MessageExtensionOption.detail"),
    };
  }
  static me(): OptionItem {
    return {
      id: "message-extension",
      label: getLocalizedString("core.MessageExtensionOption.label"),
      description: getLocalizedString("core.MessageExtensionOption.description"),
      detail: getLocalizedString("core.MessageExtensionOption.detail"),
    };
  }
  static bots(inputs?: Inputs): OptionItem[] {
    if (inputs?.platform === Platform.VS) {
      return [
        CapabilityOptions.basicBot(),
        CapabilityOptions.aiBot(),
        CapabilityOptions.aiAssistantBot(),
        CapabilityOptions.notificationBot(),
        CapabilityOptions.commandBot(),
        CapabilityOptions.workflowBot(inputs),
      ];
    }
    return [
      CapabilityOptions.basicBot(),
      CapabilityOptions.notificationBot(),
      CapabilityOptions.commandBot(),
      CapabilityOptions.workflowBot(inputs),
    ];
  }

  static tabs(): OptionItem[] {
    return [
      CapabilityOptions.nonSsoTab(),
      CapabilityOptions.m365SsoLaunchPage(),
      CapabilityOptions.dashboardTab(),
      CapabilityOptions.SPFxTab(),
    ];
  }

  static dotnetCaps(inputs?: Inputs): OptionItem[] {
    const capabilities = [
      ...CapabilityOptions.copilotPlugins(),
      ...CapabilityOptions.bots(inputs),
      CapabilityOptions.nonSsoTab(),
      CapabilityOptions.tab(),
      ...CapabilityOptions.collectMECaps(),
    ];
    if (isTdpTemplateCliTestEnabled()) {
      capabilities.push(CapabilityOptions.me());
    }

    return capabilities;
  }

  /**
   * Collect all capabilities for message extension, including dotnet and nodejs.
   * @returns OptionItem[] capability list
   */
  static collectMECaps(): OptionItem[] {
    return [
      CapabilityOptions.m365SearchMe(),
      CapabilityOptions.collectFormMe(),
      CapabilityOptions.SearchMe(),
      CapabilityOptions.linkUnfurling(),
    ];
  }

  static mes(inputs?: Inputs): OptionItem[] {
    return inputs !== undefined && getRuntime(inputs) === RuntimeOptions.DotNet().id
      ? [
          CapabilityOptions.SearchMe(),
          CapabilityOptions.collectFormMe(),
          CapabilityOptions.linkUnfurling(),
        ]
      : [
          CapabilityOptions.m365SearchMe(),
          CapabilityOptions.collectFormMe(),
          CapabilityOptions.linkUnfurling(),
        ];
  }

  static officeAddinStaticCapabilities(host?: string): OptionItem[] {
    const items: OptionItem[] = [];
    for (const h of Object.keys(OfficeAddinProjectConfig)) {
      if (host && h !== host) continue;
      const hostValue = OfficeAddinProjectConfig[h];
      for (const capability of Object.keys(hostValue)) {
        const capabilityValue = hostValue[capability];
        items.push({
          id: capability,
          label: getLocalizedString(capabilityValue.title),
          detail: getLocalizedString(capabilityValue.detail),
        });
      }
    }
    return items;
  }

  static officeAddinDynamicCapabilities(projectType: string, host?: string): OptionItem[] {
    const items: OptionItem[] = [];
    const isOutlookAddin = projectType === ProjectTypeOptions.outlookAddin().id;
    const isOfficeAddin = projectType === ProjectTypeOptions.officeAddin().id;
    const isOfficeXMLAddinForOutlook =
      projectType === ProjectTypeOptions.officeXMLAddin().id &&
      host === OfficeAddinHostOptions.outlook().id;

    const pushToItems = (option: any) => {
      const capabilityValue = OfficeAddinProjectConfig.json[option];
      items.push({
        id: option,
        label: getLocalizedString(capabilityValue.title),
        detail: getLocalizedString(capabilityValue.detail),
      });
    };

    if (isOutlookAddin || isOfficeAddin || isOfficeXMLAddinForOutlook) {
      pushToItems("json-taskpane");
      if (isOutlookAddin || isOfficeXMLAddinForOutlook) {
        items.push(CapabilityOptions.outlookAddinImport());
      } else if (isOfficeAddin) {
        items.push(CapabilityOptions.officeContentAddin());
        items.push(CapabilityOptions.officeAddinImport());
      }
    } else {
      if (host) {
        const hostValue = OfficeAddinProjectConfig[host];
        for (const capability of Object.keys(hostValue)) {
          const capabilityValue = hostValue[capability];
          items.push({
            id: capability,
            label: getLocalizedString(capabilityValue.title),
            detail: getLocalizedString(capabilityValue.detail),
          });
        }
      }
    }
    return items;
  }

  static copilotPlugins(): OptionItem[] {
    return [
      CapabilityOptions.copilotPluginNewApi(),
      CapabilityOptions.copilotPluginApiSpec(),
      // CapabilityOptions.copilotPluginOpenAIPlugin(),
    ];
  }

  static customCopilots(): OptionItem[] {
    return [
      CapabilityOptions.customCopilotBasic(),
      CapabilityOptions.customCopilotRag(),
      CapabilityOptions.customCopilotAssistant(),
    ];
  }

  static tdpIntegrationCapabilities(): OptionItem[] {
    // templates that are used by TDP integration only
    return [
      CapabilityOptions.me(),
      CapabilityOptions.botAndMe(),
      CapabilityOptions.nonSsoTabAndBot(),
    ];
  }

  static customizeGptOptions(): OptionItem[] {
    return [CapabilityOptions.customizeGptBasic(), CapabilityOptions.customizeGptWithPlugin()];
  }

  /**
   * static capability list, which does not depend on any feature flags
   */
  static staticAll(inputs?: Inputs): OptionItem[] {
    const capabilityOptions = [
      ...CapabilityOptions.bots(inputs),
      ...CapabilityOptions.tabs(),
      ...CapabilityOptions.collectMECaps(),
      ...CapabilityOptions.copilotPlugins(),
      ...CapabilityOptions.customCopilots(),
      ...CapabilityOptions.tdpIntegrationCapabilities(),
      ...CapabilityOptions.customizeGptOptions(),
    ];
    capabilityOptions.push(...CapabilityOptions.officeAddinStaticCapabilities());
    return capabilityOptions;
  }

  /**
   * dynamic capability list, which depends on feature flags
   */
  static all(inputs?: Inputs): OptionItem[] {
    const capabilityOptions = [
      ...CapabilityOptions.bots(inputs),
      ...CapabilityOptions.tabs(),
      ...CapabilityOptions.collectMECaps(),
    ];
    if (isApiCopilotPluginEnabled()) {
      capabilityOptions.push(...CapabilityOptions.copilotPlugins());
    }
    if (featureFlagManager.getBooleanValue(FeatureFlags.CustomizeGpt)) {
      capabilityOptions.push(...CapabilityOptions.customizeGptOptions());
    }
    capabilityOptions.push(...CapabilityOptions.customCopilots());
    if (isTdpTemplateCliTestEnabled()) {
      // test templates that are used by TDP integration only
      capabilityOptions.push(...CapabilityOptions.tdpIntegrationCapabilities());
    }
    capabilityOptions.push(
      ...CapabilityOptions.officeAddinDynamicCapabilities(inputs?.projectType, inputs?.host)
    );
    return capabilityOptions;
  }

  static outlookAddinImport(): OptionItem {
    return {
      id: "outlook-addin-import",
      label: getLocalizedString("core.importAddin.label"),
      detail: getLocalizedString("core.importAddin.detail"),
    };
  }

  static officeAddinImport(): OptionItem {
    return {
      id: "office-addin-import",
      label: getLocalizedString("core.importOfficeAddin.label"),
      detail: getLocalizedString("core.importAddin.detail"),
      description: getLocalizedString(
        "core.createProjectQuestion.option.description.previewOnWindow"
      ),
    };
  }

  static officeContentAddin(): OptionItem {
    return {
      id: "office-content-addin",
      label: getLocalizedString("core.officeContentAddin.label"),
      detail: getLocalizedString("core.officeContentAddin.detail"),
    };
  }

  // static officeXMLAddinHostOptionItems(host: string): OptionItem[] {
  //   return getOfficeXMLAddinHostProjectOptions(host).map((x) => ({
  //     id: x.proj,
  //     label: getLocalizedString(x.title),
  //     detail: getLocalizedString(x.detail),
  //   }));
  // }

  // static jsonAddinTaskpane(): OptionItem {
  //   return {
  //     id: "json-taskpane",
  //     label: getLocalizedString("core.newTaskpaneAddin.label"),
  //     detail: getLocalizedString("core.newTaskpaneAddin.detail"),
  //     description: getLocalizedString(
  //       "core.createProjectQuestion.option.description.previewOnWindow"
  //     ),
  //   };
  // }

  // static officeAddinItems(): OptionItem[] {
  //   return officeAddinJsonData.getProjectTemplateNames().map((template) => ({
  //     id: template,
  //     label: getLocalizedString(officeAddinJsonData.getProjectDisplayName(template)),
  //     detail: getLocalizedString(officeAddinJsonData.getProjectDetails(template)),
  //   }));
  // }

  static nonSsoTabAndBot(): OptionItem {
    return {
      id: "TabNonSsoAndBot",
      label: "", // No need to set display name as this option won't be shown in UI
    };
  }

  static botAndMe(): OptionItem {
    return {
      id: "BotAndMessageExtension",
      label: "", // No need to set display name as this option won't be shown in UI
    };
  }

  // copilot plugin
  static copilotPluginNewApi(): OptionItem {
    return {
      id: copilotPluginNewApiOptionId,
      label: getLocalizedString(
        "core.createProjectQuestion.capability.copilotPluginNewApiOption.label"
      ),
      detail: getLocalizedString(
        "core.createProjectQuestion.capability.copilotPluginNewApiOption.detail"
      ),
    };
  }

  static copilotPluginApiSpec(): OptionItem {
    return {
      id: copilotPluginApiSpecOptionId,
      label: getLocalizedString(
        "core.createProjectQuestion.capability.copilotPluginApiSpecOption.label"
      ),
      detail: getLocalizedString(
        "core.createProjectQuestion.capability.copilotPluginApiSpecOption.detail"
      ),
    };
  }

  static copilotPluginOpenAIPlugin(): OptionItem {
    return {
      id: copilotPluginOpenAIPluginOptionId,
      label: getLocalizedString(
        "core.createProjectQuestion.capability.copilotPluginAIPluginOption.label"
      ),
      detail: getLocalizedString(
        "core.createProjectQuestion.capability.copilotPluginAIPluginOption.detail"
      ),
    };
  }

  static aiBot(): OptionItem {
    return {
      id: "ai-bot",
      label: getLocalizedString("core.aiBotOption.label"),
      detail: getLocalizedString("core.aiBotOption.detail"),
    };
  }

  static aiAssistantBot(): OptionItem {
    return {
      id: "ai-assistant-bot",
      label: getLocalizedString("core.aiAssistantBotOption.label"),
      detail: getLocalizedString("core.aiAssistantBotOption.detail"),
      description: getLocalizedString("core.createProjectQuestion.option.description.preview"),
    };
  }

  // custom copilot
  static customCopilotBasic(): OptionItem {
    return {
      id: "custom-copilot-basic",
      label: getLocalizedString(
        "core.createProjectQuestion.capability.customCopilotBasicOption.label"
      ),
      detail: getLocalizedString(
        "core.createProjectQuestion.capability.customCopilotBasicOption.detail"
      ),
    };
  }

  static customCopilotRag(): OptionItem {
    return {
      id: "custom-copilot-rag",
      label: getLocalizedString(
        "core.createProjectQuestion.capability.customCopilotRagOption.label"
      ),
      detail: getLocalizedString(
        "core.createProjectQuestion.capability.customCopilotRagOption.detail"
      ),
    };
  }

  static customCopilotAssistant(): OptionItem {
    return {
      id: "custom-copilot-agent",
      label: getLocalizedString(
        "core.createProjectQuestion.capability.customCopilotAssistantOption.label"
      ),
      detail: getLocalizedString(
        "core.createProjectQuestion.capability.customCopilotAssistantOption.detail"
      ),
    };
  }

  // customize GPT
  static customizeGptBasic(): OptionItem {
    return {
      id: "basic-declarative-copilot",
      label: getLocalizedString(
        "core.createProjectQuestion.capability.declarativeCopilotBasic.title"
      ),
      detail: getLocalizedString(
        "core.createProjectQuestion.capability.declarativeCopilotBasic.detail"
      ),
    };
  }

  static customizeGptWithPlugin(): OptionItem {
    return {
      id: "declarative-copilot-with-plugin-from-scratch",
      label: getLocalizedString(
        "core.createProjectQuestion.capability.declarativeCopilotWithPlugin.title"
      ),
      detail: getLocalizedString(
        "core.createProjectQuestion.capability.declarativeCopilotWithPlugin.detail"
      ),
    };
  }
}
