// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  CLIPlatforms,
  FolderQuestion,
  IQTreeNode,
  Inputs,
  MultiSelectQuestion,
  OptionItem,
  Platform,
  SingleFileOrInputQuestion,
  SingleSelectQuestion,
  Stage,
  StaticOptions,
  TextInputQuestion,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as jsonschema from "jsonschema";
import { cloneDeep } from "lodash";
import * as os from "os";
import * as path from "path";
import { ConstantString } from "../common/constants";
import { isCLIDotNetEnabled, isCopilotPluginEnabled } from "../common/featureFlags";
import { getLocalizedString } from "../common/localizeUtils";
import { sampleProvider } from "../common/samples";
import { convertToAlphanumericOnly } from "../common/utils";
import {
  getProjectTypeAndCapability,
  isFromDevPortal,
} from "../component/developerPortalScaffoldUtils";
import { AppDefinition } from "../component/driver/teamsApp/interfaces/appdefinitions/appDefinition";
import { StaticTab } from "../component/driver/teamsApp/interfaces/appdefinitions/staticTab";
import { isPersonalApp, needBotCode } from "../component/driver/teamsApp/utils/utils";
import {
  OpenAIPluginManifestHelper,
  listOperations,
} from "../component/generator/copilotPlugin/helper";
import projectsJsonData from "../component/generator/officeAddin/config/projectsJsonData";
import { DevEnvironmentSetupError } from "../component/generator/spfx/error";
import { SPFxGenerator } from "../component/generator/spfx/spfxGenerator";
import { Constants } from "../component/generator/spfx/utils/constants";
import { Utils } from "../component/generator/spfx/utils/utils";
import { createContextV3 } from "../component/utils";
import { EmptyOptionError, assembleError } from "../error";
import { CliQuestionName, QuestionNames } from "./questionNames";
import { isValidHttpUrl } from "./util";
import {
  copilotPluginApiSpecOptionId,
  copilotPluginExistingApiOptionIds,
  copilotPluginOpenAIPluginOptionId,
} from "./constants";

export class ScratchOptions {
  static yes(): OptionItem {
    return {
      id: "yes",
      label: getLocalizedString("core.ScratchOptionYes.label"),
      detail: getLocalizedString("core.ScratchOptionYes.detail"),
    };
  }
  static no(): OptionItem {
    return {
      id: "no",
      label: getLocalizedString("core.ScratchOptionNo.label"),
      detail: getLocalizedString("core.ScratchOptionNo.detail"),
    };
  }
  static all(): OptionItem[] {
    return [ScratchOptions.yes(), ScratchOptions.no()];
  }
}

export class ProjectTypeOptions {
  static tab(platform?: Platform): OptionItem {
    return {
      id: "tab-type",
      label: `${platform === Platform.VSCode ? "$(browser) " : ""}${getLocalizedString(
        "core.TabOption.label"
      )}`,
      detail: getLocalizedString("core.createProjectQuestion.projectType.tab.detail"),
    };
  }

  static bot(platform?: Platform): OptionItem {
    return {
      id: "bot-type",
      label: `${platform === Platform.VSCode ? "$(hubot) " : ""}${getLocalizedString(
        "core.createProjectQuestion.projectType.bot.label"
      )}`,
      detail: getLocalizedString("core.createProjectQuestion.projectType.bot.detail"),
    };
  }

  static me(platform?: Platform): OptionItem {
    return {
      id: "me-type",
      label: `${platform === Platform.VSCode ? "$(symbol-keyword) " : ""}${getLocalizedString(
        "core.MessageExtensionOption.label"
      )}`,
      detail: getLocalizedString("core.createProjectQuestion.projectType.messageExtension.detail"),
    };
  }

  static outlookAddin(platform?: Platform): OptionItem {
    return {
      id: "outlook-addin-type",
      label: `${platform === Platform.VSCode ? "$(mail) " : ""}${getLocalizedString(
        "core.createProjectQuestion.projectType.outlookAddin.label"
      )}`,
      detail: getLocalizedString("core.createProjectQuestion.projectType.outlookAddin.detail"),
    };
  }

  static copilotPlugin(platform?: Platform): OptionItem {
    return {
      id: "copilot-plugin-type",
      label: `${platform === Platform.VSCode ? "$(sparkle) " : ""}${getLocalizedString(
        "core.createProjectQuestion.projectType.copilotPlugin.label"
      )}`,
      detail: getLocalizedString("core.createProjectQuestion.projectType.copilotPlugin.detail"),
    };
  }
}

function projectTypeQuestion(): SingleSelectQuestion {
  const staticOptions: StaticOptions = [
    ProjectTypeOptions.bot(Platform.CLI),
    ProjectTypeOptions.tab(Platform.CLI),
    ProjectTypeOptions.me(Platform.CLI),
    ProjectTypeOptions.outlookAddin(Platform.CLI),
  ];
  return {
    name: QuestionNames.ProjectType,
    title: getLocalizedString("core.createProjectQuestion.title"),
    type: "singleSelect",
    staticOptions: staticOptions,
    dynamicOptions: (inputs: Inputs) => {
      let staticOptions: StaticOptions;

      if (isCopilotPluginEnabled()) {
        staticOptions = [
          ProjectTypeOptions.copilotPlugin(inputs.platform),
          ProjectTypeOptions.bot(inputs.platform),
          ProjectTypeOptions.tab(inputs.platform),
          ProjectTypeOptions.me(inputs.platform),
        ];
      } else {
        staticOptions = [
          ProjectTypeOptions.bot(inputs.platform),
          ProjectTypeOptions.tab(inputs.platform),
          ProjectTypeOptions.me(inputs.platform),
        ];
      }

      if (isFromDevPortal(inputs)) {
        const projectType = getProjectTypeAndCapability(inputs.teamsAppFromTdp)?.projectType;
        if (projectType) {
          return [projectType];
        }
      } else {
        staticOptions.push(ProjectTypeOptions.outlookAddin(inputs.platform));
      }
      return staticOptions;
    },
    placeholder: getLocalizedString("core.getCreateNewOrFromSampleQuestion.placeholder"),
    forgetLastValue: true,
    skipSingleOption: true,
  };
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
      detail: getLocalizedString("core.M365SearchAppOptionItem.detail"),
      description: getLocalizedString(
        "core.createProjectQuestion.option.description.worksInOutlook"
      ),
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
    return inputs !== undefined && getRuntime(inputs) === RuntimeOptions.DotNet().id
      ? // currently no ai bot for dotnet
        [
          CapabilityOptions.basicBot(),
          CapabilityOptions.notificationBot(),
          CapabilityOptions.commandBot(),
          CapabilityOptions.workflowBot(inputs),
        ]
      : [
          CapabilityOptions.basicBot(),
          CapabilityOptions.aiBot(),
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
    return [
      ...CapabilityOptions.copilotPlugins(),
      ...CapabilityOptions.bots(inputs),
      CapabilityOptions.nonSsoTab(),
      CapabilityOptions.tab(),
      ...CapabilityOptions.mes(inputs),
    ];
  }

  static mes(inputs?: Inputs): OptionItem[] {
    return inputs !== undefined && getRuntime(inputs) === RuntimeOptions.DotNet().id
      ? [
          CapabilityOptions.linkUnfurling(),
          CapabilityOptions.SearchMe(),
          CapabilityOptions.collectFormMe(),
        ]
      : [
          CapabilityOptions.linkUnfurling(),
          CapabilityOptions.m365SearchMe(),
          CapabilityOptions.collectFormMe(),
        ];
  }

  static copilotPlugins(): OptionItem[] {
    return [
      CapabilityOptions.copilotPluginNewApi(),
      CapabilityOptions.copilotPluginApiSpec(),
      CapabilityOptions.copilotPluginOpenAIPlugin(),
    ];
  }

  static copilotPluginCli(): OptionItem {
    return {
      id: "copilot-plugin-capability",
      label: `${getLocalizedString("core.createProjectQuestion.projectType.copilotPlugin.label")}`,
      detail: getLocalizedString("core.createProjectQuestion.projectType.copilotPlugin.detail"),
    };
  }

  static staticAll(inputs?: Inputs): OptionItem[] {
    const capabilityOptions = [
      ...CapabilityOptions.bots(inputs),
      ...CapabilityOptions.tabs(),
      ...CapabilityOptions.mes(),
      CapabilityOptions.copilotPluginCli(),
    ];

    return capabilityOptions;
  }

  static all(inputs?: Inputs): OptionItem[] {
    // teamsfx list capabilities
    const capabilityOptions = [
      ...CapabilityOptions.bots(inputs),
      ...CapabilityOptions.tabs(),
      ...CapabilityOptions.mes(),
    ];
    if (isCopilotPluginEnabled()) {
      capabilityOptions.push(CapabilityOptions.copilotPluginCli());
    }

    return capabilityOptions;
  }

  static officeAddinImport(): OptionItem {
    return {
      id: "import",
      label: getLocalizedString("core.importAddin.label"),
      detail: getLocalizedString("core.importAddin.detail"),
      description: getLocalizedString(
        "core.createProjectQuestion.option.description.previewOnWindow"
      ),
    };
  }

  static officeAddinItems(): OptionItem[] {
    return officeAddinJsonData.getProjectTemplateNames().map((template) => ({
      id: template,
      label: getLocalizedString(officeAddinJsonData.getProjectDisplayName(template)),
      detail: getLocalizedString(officeAddinJsonData.getProjectDetails(template)),
      description: getLocalizedString(
        "core.createProjectQuestion.option.description.previewOnWindow"
      ),
    }));
  }

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
      id: "new-api",
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
}

export function capabilityQuestion(): SingleSelectQuestion {
  return {
    name: QuestionNames.Capabilities,
    title: (inputs: Inputs) => {
      const projectType = inputs[QuestionNames.ProjectType];
      switch (projectType) {
        case ProjectTypeOptions.bot().id:
          return getLocalizedString("core.createProjectQuestion.projectType.bot.title");
        case ProjectTypeOptions.tab().id:
          return getLocalizedString("core.createProjectQuestion.projectType.tab.title");
        case ProjectTypeOptions.me().id:
          return getLocalizedString(
            "core.createProjectQuestion.projectType.messageExtension.title"
          );
        case ProjectTypeOptions.outlookAddin().id:
          return getLocalizedString("core.createProjectQuestion.projectType.outlookAddin.title");
        case ProjectTypeOptions.copilotPlugin().id:
          return getLocalizedString("core.createProjectQuestion.projectType.copilotPlugin.title");
        default:
          return getLocalizedString("core.createCapabilityQuestion.titleNew");
      }
    },
    cliDescription: "Specifies the Microsoft Teams App capability.",
    cliName: CliQuestionName.Capability,
    cliShortName: "c",
    cliChoiceListCommand: "teamsfx list templates",
    type: "singleSelect",
    staticOptions: CapabilityOptions.staticAll(),
    dynamicOptions: (inputs: Inputs) => {
      // from dev portal
      if (isFromDevPortal(inputs)) {
        const capability = getProjectTypeAndCapability(inputs.teamsAppFromTdp)?.templateId;
        if (capability) {
          return [capability];
        }
      }
      // dotnet capabilities
      if (getRuntime(inputs) === RuntimeOptions.DotNet().id) {
        return CapabilityOptions.dotnetCaps(inputs);
      }

      if (inputs.nonInteractive && inputs.platform === Platform.CLI) {
        //cli non-interactive mode the choice list is the same as staticOptions
        return CapabilityOptions.all(inputs);
      }

      // nodejs capabilities
      const projectType = inputs[QuestionNames.ProjectType];
      if (projectType === ProjectTypeOptions.bot().id) {
        return CapabilityOptions.bots(inputs);
      } else if (projectType === ProjectTypeOptions.tab().id) {
        return CapabilityOptions.tabs();
      } else if (projectType === ProjectTypeOptions.me().id) {
        return CapabilityOptions.mes();
      } else if (projectType === ProjectTypeOptions.outlookAddin().id) {
        return [...CapabilityOptions.officeAddinItems(), CapabilityOptions.officeAddinImport()];
      } else if (projectType === ProjectTypeOptions.copilotPlugin().id) {
        return CapabilityOptions.copilotPlugins();
      } else {
        return CapabilityOptions.all(inputs);
      }
    },
    placeholder: (inputs: Inputs) => {
      if (inputs[QuestionNames.ProjectType] === ProjectTypeOptions.copilotPlugin().id) {
        return getLocalizedString(
          "core.createProjectQuestion.projectType.copilotPlugin.placeholder"
        );
      }
      return getLocalizedString("core.createCapabilityQuestion.placeholder");
    },
    forgetLastValue: true,
    skipSingleOption: true,
  };
}

enum HostType {
  AppService = "app-service",
  Functions = "azure-functions",
}

const NotificationTriggers = {
  HTTP: "http",
  TIMER: "timer",
} as const;

type NotificationTrigger = typeof NotificationTriggers[keyof typeof NotificationTriggers];

interface HostTypeTriggerOptionItem extends OptionItem {
  hostType: HostType;
  triggers?: NotificationTrigger[];
}

export class NotificationTriggerOptions {
  static appService(): HostTypeTriggerOptionItem {
    return {
      id: "http-restify",
      hostType: HostType.AppService,
      label: getLocalizedString("plugins.bot.triggers.http-restify.label"),
      description: getLocalizedString("plugins.bot.triggers.http-restify.description"),
      detail: getLocalizedString("plugins.bot.triggers.http-restify.detail"),
    };
  }
  static appServiceForVS(): HostTypeTriggerOptionItem {
    return {
      id: "http-webapi",
      hostType: HostType.AppService,
      label: getLocalizedString("plugins.bot.triggers.http-webapi.label"),
      description: getLocalizedString("plugins.bot.triggers.http-webapi.description"),
      detail: getLocalizedString("plugins.bot.triggers.http-webapi.detail"),
    };
  }
  // NOTE: id must be the sample as cliName to prevent parsing error for CLI default value.
  static functionsTimerTrigger(): HostTypeTriggerOptionItem {
    return {
      id: "timer-functions",
      hostType: HostType.Functions,
      triggers: [NotificationTriggers.TIMER],
      label: getLocalizedString("plugins.bot.triggers.timer-functions.label"),
      description: getLocalizedString("plugins.bot.triggers.timer-functions.description"),
      detail: getLocalizedString("plugins.bot.triggers.timer-functions.detail"),
    };
  }

  static functionsHttpAndTimerTrigger(): HostTypeTriggerOptionItem {
    return {
      id: "http-and-timer-functions",
      hostType: HostType.Functions,
      triggers: [NotificationTriggers.HTTP, NotificationTriggers.TIMER],
      label: getLocalizedString("plugins.bot.triggers.http-and-timer-functions.label"),
      description: getLocalizedString("plugins.bot.triggers.http-and-timer-functions.description"),
      detail: getLocalizedString("plugins.bot.triggers.http-and-timer-functions.detail"),
    };
  }

  static functionsHttpTrigger(): HostTypeTriggerOptionItem {
    return {
      id: "http-functions",
      hostType: HostType.Functions,
      triggers: [NotificationTriggers.HTTP],
      label: getLocalizedString("plugins.bot.triggers.http-functions.label"),
      description: getLocalizedString("plugins.bot.triggers.http-functions.description"),
      detail: getLocalizedString("plugins.bot.triggers.http-functions.detail"),
    };
  }

  static functionsTriggers(): HostTypeTriggerOptionItem[] {
    return [
      NotificationTriggerOptions.functionsHttpAndTimerTrigger(),
      NotificationTriggerOptions.functionsHttpTrigger(),
      NotificationTriggerOptions.functionsTimerTrigger(),
    ];
  }

  static all(): HostTypeTriggerOptionItem[] {
    return [
      NotificationTriggerOptions.appService(),
      NotificationTriggerOptions.appServiceForVS(),
      NotificationTriggerOptions.functionsHttpAndTimerTrigger(),
      NotificationTriggerOptions.functionsHttpTrigger(),
      NotificationTriggerOptions.functionsTimerTrigger(),
    ];
  }
}

function getRuntime(inputs: Inputs): string {
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

function botTriggerQuestion(): SingleSelectQuestion {
  return {
    name: QuestionNames.BotTrigger,
    title: getLocalizedString("plugins.bot.questionHostTypeTrigger.title"),
    cliDescription: "Specifies the trigger for `Chat Notification Message` app template.",
    cliShortName: "t",
    type: "singleSelect",
    staticOptions: NotificationTriggerOptions.all(),
    dynamicOptions: (inputs: Inputs) => {
      const runtime = getRuntime(inputs);
      return [
        runtime === RuntimeOptions.DotNet().id
          ? NotificationTriggerOptions.appServiceForVS()
          : NotificationTriggerOptions.appService(),
        ...NotificationTriggerOptions.functionsTriggers(),
      ];
    },
    default: (inputs: Inputs) => {
      const runtime = getRuntime(inputs);
      return runtime === RuntimeOptions.DotNet().id
        ? NotificationTriggerOptions.appServiceForVS().id
        : NotificationTriggerOptions.appService().id;
    },
    placeholder: getLocalizedString("plugins.bot.questionHostTypeTrigger.placeholder"),
  };
}

function copilotPluginDevelopmentQuestion(): SingleSelectQuestion {
  return {
    name: QuestionNames.CopilotPluginDevelopment,
    title: getLocalizedString("core.createProjectQuestion.projectType.copilotPlugin.title"),
    type: "singleSelect",
    staticOptions: CapabilityOptions.copilotPlugins(),
    cliShortName: "p",
    cliDescription: "Plugin for Copilot.",
  };
}

function SPFxSolutionQuestion(): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: QuestionNames.SPFxSolution,
    title: getLocalizedString("plugins.spfx.questions.spfxSolution.title"),
    cliDescription: "Create a new or import an existing SharePoint Framework solution.",
    cliShortName: "s",
    staticOptions: [
      {
        id: "new",
        label: getLocalizedString("plugins.spfx.questions.spfxSolution.createNew"),
        detail: getLocalizedString("plugins.spfx.questions.spfxSolution.createNew.detail"),
      },
      {
        id: "import",
        label: getLocalizedString("plugins.spfx.questions.spfxSolution.importExisting"),
        detail: getLocalizedString("plugins.spfx.questions.spfxSolution.importExisting.detail"),
      },
    ],
    default: "new",
  };
}
export function SPFxPackageSelectQuestion(): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: QuestionNames.SPFxInstallPackage,
    title: getLocalizedString("plugins.spfx.questions.packageSelect.title"),
    cliDescription: "Install the latest version of SharePoint Framework.",
    staticOptions: [],
    placeholder: getLocalizedString("plugins.spfx.questions.packageSelect.placeholder"),
    dynamicOptions: async (inputs: Inputs): Promise<OptionItem[]> => {
      const versions = await Promise.all([
        Utils.findGloballyInstalledVersion(undefined, Constants.GeneratorPackageName, 0, false),
        Utils.findLatestVersion(undefined, Constants.GeneratorPackageName, 5),
        Utils.findGloballyInstalledVersion(undefined, Constants.YeomanPackageName, 0, false),
      ]);

      inputs.globalSpfxPackageVersion = versions[0];
      inputs.latestSpfxPackageVersion = versions[1];
      inputs.globalYeomanPackageVersion = versions[2];

      return [
        {
          id: SPFxVersionOptionIds.installLocally,

          label:
            versions[1] !== undefined
              ? getLocalizedString(
                  "plugins.spfx.questions.packageSelect.installLocally.withVersion.label",
                  "v" + versions[1]
                )
              : getLocalizedString(
                  "plugins.spfx.questions.packageSelect.installLocally.noVersion.label"
                ),
        },
        {
          id: SPFxVersionOptionIds.globalPackage,
          label:
            versions[0] !== undefined
              ? getLocalizedString(
                  "plugins.spfx.questions.packageSelect.useGlobalPackage.withVersion.label",
                  "v" + versions[0]
                )
              : getLocalizedString(
                  "plugins.spfx.questions.packageSelect.useGlobalPackage.noVersion.label"
                ),
          description: getLocalizedString(
            "plugins.spfx.questions.packageSelect.useGlobalPackage.detail",
            Constants.RecommendedLowestSpfxVersion
          ),
        },
      ];
    },
    default: SPFxVersionOptionIds.installLocally,
    validation: {
      validFunc: (input: string, previousInputs?: Inputs): Promise<string | undefined> => {
        if (input === SPFxVersionOptionIds.globalPackage) {
          const hasPackagesInstalled =
            !!previousInputs &&
            !!previousInputs.globalSpfxPackageVersion &&
            !!previousInputs.globalYeomanPackageVersion;
          if (!hasPackagesInstalled) {
            return Promise.reject(DevEnvironmentSetupError());
          }
        }
        return Promise.resolve(undefined);
      },
    },
    isBoolean: true,
  };
}

function SPFxFrameworkQuestion(): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: QuestionNames.SPFxFramework,
    cliShortName: "k",
    cliDescription: "Framework.",
    title: getLocalizedString("plugins.spfx.questions.framework.title"),
    staticOptions: [
      { id: "react", label: "React" },
      { id: "minimal", label: "Minimal" },
      { id: "none", label: "None" },
    ],
    placeholder: "Select an option",
    default: "react",
  };
}

export function SPFxWebpartNameQuestion(): TextInputQuestion {
  return {
    type: "text",
    name: QuestionNames.SPFxWebpartName,
    cliShortName: "w",
    cliDescription: "Name for SharePoint Framework Web Part.",
    title: getLocalizedString("plugins.spfx.questions.webpartName"),
    default: Constants.DEFAULT_WEBPART_NAME,
    validation: {
      validFunc: async (input: string, previousInputs?: Inputs): Promise<string | undefined> => {
        const schema = {
          pattern: "^[a-zA-Z_][a-zA-Z0-9_]*$",
        };
        const validateRes = jsonschema.validate(input, schema);
        if (validateRes.errors && validateRes.errors.length > 0) {
          return getLocalizedString(
            "plugins.spfx.questions.webpartName.error.notMatch",
            input,
            schema.pattern
          );
        }

        if (
          previousInputs &&
          ((previousInputs.stage === Stage.addWebpart &&
            previousInputs[QuestionNames.SPFxFolder]) ||
            (previousInputs?.stage === Stage.addFeature && previousInputs?.projectPath))
        ) {
          const webpartFolder = path.join(
            previousInputs[QuestionNames.SPFxFolder],
            "src",
            "webparts",
            input
          );
          if (await fs.pathExists(webpartFolder)) {
            return getLocalizedString(
              "plugins.spfx.questions.webpartName.error.duplicate",
              webpartFolder
            );
          }
        }
        return undefined;
      },
    },
  };
}
export enum SPFxVersionOptionIds {
  installLocally = "true",
  globalPackage = "false",
}

export function SPFxImportFolderQuestion(hasDefaultFunc = false): FolderQuestion {
  return {
    type: "folder",
    name: QuestionNames.SPFxFolder,
    title: getLocalizedString("core.spfxFolder.title"),
    cliDescription: "Directory or Path that contains the existing SharePoint Framework solution.",
    placeholder: getLocalizedString("core.spfxFolder.placeholder"),
    default: hasDefaultFunc
      ? (inputs: Inputs) => {
          if (inputs.projectPath) return path.join(inputs.projectPath, "src");
          return undefined;
        }
      : undefined,
  };
}
export const getTemplate = (inputs: Inputs): string => {
  const capabilities: string[] = inputs[QuestionNames.Capabilities];
  const templates: string[] = officeAddinJsonData.getProjectTemplateNames();
  const foundTemplate = templates.find((template) => {
    return capabilities && capabilities.includes(template);
  });

  return foundTemplate ?? "";
};
export function officeAddinHostingQuestion(): SingleSelectQuestion {
  const OfficeHostQuestion: SingleSelectQuestion = {
    type: "singleSelect",
    name: QuestionNames.OfficeAddinHost,
    title: "Add-in Host",
    staticOptions: [],
    dynamicOptions: (inputs: Inputs) => {
      const template = getTemplate(inputs);
      const getHostTemplateNames = officeAddinJsonData.getHostTemplateNames(template);
      const options = getHostTemplateNames.map((host) => ({
        label: officeAddinJsonData.getHostDisplayName(host) as string,
        id: host,
      }));
      return options.length > 0 ? options : [{ label: "No Options", id: "No Options" }];
    },
    default: (inputs: Inputs) => {
      const template = getTemplate(inputs);
      const options = officeAddinJsonData.getHostTemplateNames(template);
      return options[0] || "No Options";
    },
    skipSingleOption: true,
  };
  return OfficeHostQuestion;
}

const officeAddinJsonData = new projectsJsonData();

export function getLanguageOptions(inputs: Inputs): OptionItem[] {
  const runtime = getRuntime(inputs);
  // dotnet runtime only supports C#
  if (runtime === RuntimeOptions.DotNet().id) {
    return [{ id: "csharp", label: "C#" }];
  }
  // office addin supports language defined in officeAddinJsonData
  const projectType = inputs[QuestionNames.ProjectType];
  if (projectType === ProjectTypeOptions.outlookAddin().id) {
    const template = getTemplate(inputs);
    const supportedTypes = officeAddinJsonData.getSupportedScriptTypes(template);
    const options = supportedTypes.map((language) => ({ label: language, id: language }));
    return options.length > 0 ? options : [{ label: "No Options", id: "No Options" }];
  }
  const capabilities = inputs[QuestionNames.Capabilities] as string;
  // SPFx only supports typescript
  if (capabilities === CapabilityOptions.SPFxTab().id) {
    return [{ id: "typescript", label: "TypeScript" }];
  }
  // other case
  return [
    { id: "javascript", label: "JavaScript" },
    { id: "typescript", label: "TypeScript" },
  ];
}

export enum ProgrammingLanguage {
  JS = "javascript",
  TS = "typescript",
  CSharp = "csharp",
}

export function programmingLanguageQuestion(): SingleSelectQuestion {
  const programmingLanguageQuestion: SingleSelectQuestion = {
    name: QuestionNames.ProgrammingLanguage,
    cliShortName: "l",
    title: "Programming Language.",
    type: "singleSelect",
    staticOptions: [
      { id: ProgrammingLanguage.JS, label: "JavaScript" },
      { id: ProgrammingLanguage.TS, label: "TypeScript" },
      { id: ProgrammingLanguage.CSharp, label: "C#" },
    ],
    dynamicOptions: getLanguageOptions,
    default: (inputs: Inputs) => {
      return getLanguageOptions(inputs)[0].id;
    },
    placeholder: (inputs: Inputs): string => {
      const runtime = getRuntime(inputs);
      // dotnet
      if (runtime === RuntimeOptions.DotNet().id) {
        return "";
      }
      // office addin
      const projectType = inputs[QuestionNames.ProjectType];
      if (projectType === ProjectTypeOptions.outlookAddin().id) {
        const template = getTemplate(inputs);
        const options = officeAddinJsonData.getSupportedScriptTypes(template);
        return options[0] || "No Options";
      }
      const capabilities = inputs[QuestionNames.Capabilities] as string;
      // SPFx
      if (capabilities === CapabilityOptions.SPFxTab().id) {
        return getLocalizedString("core.ProgrammingLanguageQuestion.placeholder.spfx");
      }
      // other
      return getLocalizedString("core.ProgrammingLanguageQuestion.placeholder");
    },
    skipSingleOption: true,
  };
  return programmingLanguageQuestion;
}

export function folderQuestion(): FolderQuestion {
  return {
    type: "folder",
    name: QuestionNames.Folder,
    cliShortName: "f",
    title: (inputs: Inputs) =>
      CLIPlatforms.includes(inputs.platform)
        ? "Directory where the project folder will be created in"
        : getLocalizedString("core.question.workspaceFolder.title"),
    cliDescription: "Directory where the project folder will be created in.",
    placeholder: getLocalizedString("core.question.workspaceFolder.placeholder"),
    default: (inputs: Inputs) =>
      CLIPlatforms.includes(inputs.platform)
        ? "./"
        : path.join(os.homedir(), ConstantString.RootFolder),
  };
}

export const AppNamePattern =
  '^(?=(.*[\\da-zA-Z]){2})[a-zA-Z][^"<>:\\?/*&|\u0000-\u001F]*[^"\\s.<>:\\?/*&|\u0000-\u001F]$';

export function appNameQuestion(): TextInputQuestion {
  const question: TextInputQuestion = {
    type: "text",
    name: QuestionNames.AppName,
    cliShortName: "n",
    title: "Application name",
    required: true,
    default: async (inputs: Inputs) => {
      let defaultName = undefined;
      if (inputs.teamsAppFromTdp?.appName) {
        defaultName = convertToAlphanumericOnly(inputs.teamsAppFromTdp?.appName);
      } else if (inputs[QuestionNames.SPFxSolution] == "import") {
        defaultName = await SPFxGenerator.getSolutionName(inputs[QuestionNames.SPFxFolder]);
      } else if (inputs.openAIPluginManifest) {
        defaultName = inputs.openAIPluginManifest.name_for_human;
      }
      return defaultName;
    },
    validation: {
      validFunc: async (input: string, previousInputs?: Inputs): Promise<string | undefined> => {
        const schema = {
          pattern: AppNamePattern,
          maxLength: 30,
        };
        const appName = input;
        const validateResult = jsonschema.validate(appName, schema);
        if (validateResult.errors && validateResult.errors.length > 0) {
          if (validateResult.errors[0].name === "pattern") {
            return getLocalizedString("core.QuestionAppName.validation.pattern");
          }
          if (validateResult.errors[0].name === "maxLength") {
            return getLocalizedString("core.QuestionAppName.validation.maxlength");
          }
        }
        if (previousInputs && previousInputs.folder) {
          const folder = previousInputs.folder as string;
          if (folder) {
            const projectPath = path.resolve(folder, appName);
            const exists = await fs.pathExists(projectPath);
            if (exists)
              return getLocalizedString("core.QuestionAppName.validation.pathExist", projectPath);
          }
        }
        return undefined;
      },
    },
    placeholder: "Application name",
  };
  return question;
}

function sampleSelectQuestion(): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: QuestionNames.Samples,
    cliName: "sample-name",
    cliDescription: "Specifies the Microsoft Teams App sample name.",
    cliChoiceListCommand: "teamsfx list samples",
    skipValidation: true,
    cliType: "argument",
    title: getLocalizedString("core.SampleSelect.title"),
    staticOptions: sampleProvider.SampleCollection.samples.map((sample) => {
      return {
        id: sample.id,
        label: sample.title,
        description: `${sample.time} • ${sample.configuration}`,
        detail: sample.shortDescription,
      } as OptionItem;
    }),
    dynamicOptions: async () => {
      await sampleProvider.fetchSampleConfig();
      return sampleProvider.SampleCollection.samples.map((sample) => {
        return {
          id: sample.id,
          label: sample.title,
          description: `${sample.time} • ${sample.configuration}`,
          detail: sample.shortDescription,
        } as OptionItem;
      });
    },
    placeholder: getLocalizedString("core.SampleSelect.placeholder"),
    buttons: [
      {
        icon: "library",
        tooltip: getLocalizedString("core.SampleSelect.buttons.viewSamples"),
        command: "fx-extension.openSamples",
      },
    ],
  };
}
export class RuntimeOptions {
  static NodeJS(): OptionItem {
    return {
      id: "node",
      label: "Node.js",
      detail: getLocalizedString("core.RuntimeOptionNodeJS.detail"),
    };
  }
  static DotNet(): OptionItem {
    return {
      id: "dotnet",
      label: ".NET Core",
      detail: getLocalizedString("core.RuntimeOptionDotNet.detail"),
    };
  }
}

function runtimeQuestion(): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: QuestionNames.Runtime,
    title: getLocalizedString("core.getRuntimeQuestion.title"),
    staticOptions: [RuntimeOptions.NodeJS(), RuntimeOptions.DotNet()],
    default: RuntimeOptions.NodeJS().id,
    placeholder: getLocalizedString("core.getRuntimeQuestion.placeholder"),
    cliHidden: true,
  };
}
const defaultTabLocalHostUrl = "https://localhost:53000/index.html#/tab";
const tabContentUrlOptionItem = (tab: StaticTab): OptionItem => {
  return {
    id: tab.name,
    label: tab.name,
    detail: getLocalizedString(
      "core.updateContentUrlOption.description",
      tab.contentUrl,
      defaultTabLocalHostUrl
    ),
  };
};
const tabWebsiteUrlOptionItem = (tab: StaticTab): OptionItem => {
  return {
    id: tab.name,
    label: tab.name,
    detail: getLocalizedString(
      "core.updateWebsiteUrlOption.description",
      tab.websiteUrl,
      defaultTabLocalHostUrl
    ),
  };
};
function getTabWebsiteOptions(inputs: Inputs): OptionItem[] {
  const appDefinition = inputs.teamsAppFromTdp as AppDefinition;
  if (appDefinition?.staticTabs) {
    const tabsWithWebsiteUrls = appDefinition.staticTabs.filter((o) => !!o.websiteUrl);
    if (tabsWithWebsiteUrls.length > 0) {
      return tabsWithWebsiteUrls.map((o) => tabWebsiteUrlOptionItem(o));
    }
  }
  return [];
}

function selectTabWebsiteUrlQuestion(): MultiSelectQuestion {
  return {
    type: "multiSelect",
    name: QuestionNames.ReplaceWebsiteUrl,
    title: getLocalizedString("core.updateWebsiteUrlQuestion.title"),
    staticOptions: [],
    dynamicOptions: getTabWebsiteOptions,
    default: (inputs: Inputs) => {
      const options = getTabWebsiteOptions(inputs);
      return options.map((o) => o.id);
    },
    placeholder: getLocalizedString("core.updateUrlQuestion.placeholder"),
    forgetLastValue: true,
  };
}

function getTabContentUrlOptions(inputs: Inputs): OptionItem[] {
  const appDefinition = inputs.teamsAppFromTdp as AppDefinition;
  if (appDefinition?.staticTabs) {
    const tabsWithContentUrls = appDefinition.staticTabs.filter((o) => !!o.contentUrl);
    if (tabsWithContentUrls.length > 0) {
      return tabsWithContentUrls.map((o) => tabContentUrlOptionItem(o));
    }
  }
  return [];
}

const selectTabsContentUrlQuestion = (): MultiSelectQuestion => {
  return {
    type: "multiSelect",
    name: QuestionNames.ReplaceContentUrl,
    title: getLocalizedString("core.updateContentUrlQuestion.title"),
    staticOptions: [],
    dynamicOptions: getTabContentUrlOptions,
    default: (inputs: Inputs) => {
      const options = getTabContentUrlOptions(inputs);
      return options.map((o) => o.id);
    },
    placeholder: getLocalizedString("core.updateUrlQuestion.placeholder"),
    forgetLastValue: true,
  };
};
const answerToRepaceBotId = "bot";
const answerToReplaceMessageExtensionBotId = "messageExtension";
const botOptionItem = (isMessageExtension: boolean, botId: string): OptionItem => {
  return {
    id: isMessageExtension ? answerToReplaceMessageExtensionBotId : answerToRepaceBotId,
    label: isMessageExtension
      ? getLocalizedString("core.updateBotIdForMessageExtension.label")
      : getLocalizedString("core.updateBotIdForBot.label"),
    detail: isMessageExtension
      ? getLocalizedString("core.updateBotIdForMessageExtension.description", botId)
      : getLocalizedString("core.updateBotIdForBot.description", botId),
  };
};

function getBotIdAndMeId(appDefinition: AppDefinition) {
  const bots = appDefinition.bots;
  const messageExtensions = appDefinition.messagingExtensions;
  // can add only one bot. If existing, the length is 1.
  const botId = !!bots && bots.length > 0 ? bots[0].botId : undefined;
  // can add only one message extension. If existing, the length is 1.
  const messageExtensionId =
    !!messageExtensions && messageExtensions.length > 0 ? messageExtensions[0].botId : undefined;
  return [botId, messageExtensionId];
}

function getBotOptions(inputs: Inputs): OptionItem[] {
  const appDefinition = inputs.teamsAppFromTdp as AppDefinition;
  if (!appDefinition) return [];
  const [botId, messageExtensionId] = getBotIdAndMeId(appDefinition);
  const options: OptionItem[] = [];
  if (botId) {
    options.push(botOptionItem(false, botId));
  }
  if (messageExtensionId) {
    options.push(botOptionItem(true, messageExtensionId));
  }
  return options;
}

function selectBotIdsQuestion(): MultiSelectQuestion {
  // const statcOptions: OptionItem[] = [];
  // statcOptions.push(botOptionItem(false, "000000-0000-0000"));
  // statcOptions.push(botOptionItem(true, "000000-0000-0000"));
  return {
    type: "multiSelect",
    name: QuestionNames.ReplaceBotIds,
    title: getLocalizedString("core.updateBotIdsQuestion.title"),
    staticOptions: [],
    dynamicOptions: getBotOptions,
    default: (inputs: Inputs) => {
      const options = getBotOptions(inputs);
      return options.map((o) => o.id);
    },
    placeholder: getLocalizedString("core.updateBotIdsQuestion.placeholder"),
    forgetLastValue: true,
  };
}

const maximumLengthOfDetailsErrorMessageInInputBox = 90;

export function apiSpecLocationQuestion(includeExistingAPIs = true): SingleFileOrInputQuestion {
  const validationOnAccept = async (
    input: string,
    inputs?: Inputs
  ): Promise<string | undefined> => {
    try {
      const context = createContextV3();
      const res = await listOperations(
        context,
        undefined,
        input,
        inputs![QuestionNames.ManifestPath],
        includeExistingAPIs,
        false
      );
      if (res.isOk()) {
        inputs!.supportedApisFromApiSpec = res.value;
      } else {
        const errors = res.error;
        if (inputs?.platform === Platform.CLI) {
          return errors.map((e) => e.content).join("\n");
        }
        if (
          errors.length === 1 &&
          errors[0].content.length <= maximumLengthOfDetailsErrorMessageInInputBox
        ) {
          return errors[0].content;
        } else {
          return inputs!.platform === Platform.VSCode
            ? getLocalizedString(
                "core.createProjectQuestion.apiSpec.multipleValidationErrors.vscode.message"
              )
            : getLocalizedString(
                "core.createProjectQuestion.apiSpec.multipleValidationErrors.message"
              );
        }
      }
    } catch (e) {
      const error = assembleError(e);
      throw error;
    }
  };
  return {
    type: "singleFileOrText",
    name: QuestionNames.ApiSpecLocation,
    cliShortName: "a",
    cliDescription: "OpenAPI specification file location.",
    title: getLocalizedString("core.createProjectQuestion.apiSpec.title"),
    forgetLastValue: true,
    inputBoxConfig: {
      type: "innerText",
      title: getLocalizedString("core.createProjectQuestion.apiSpec.title"),
      placeholder: getLocalizedString("core.createProjectQuestion.apiSpec.placeholder"),
      name: "input-api-spec-url",
      step: 2, // Add "back" button
      validation: {
        validFunc: (input: string, inputs?: Inputs): Promise<string | undefined> => {
          const result = isValidHttpUrl(input)
            ? undefined
            : inputs?.platform === Platform.CLI
            ? "Please enter a valid URL or local path of your API Specification"
            : getLocalizedString("core.createProjectQuestion.invalidUrl.message");
          return Promise.resolve(result);
        },
      },
    },
    inputOptionItem: {
      id: "input",
      label: getLocalizedString("core.createProjectQuestion.apiSpecInputUrl.label"),
    },
    filters: {
      files: ["json", "yml", "yaml"],
    },
    validation: {
      validFunc: async (input: string, inputs?: Inputs): Promise<string | undefined> => {
        if (!isValidHttpUrl(input) && !(await fs.pathExists(input))) {
          return "Please enter a valid URL or local path of your API Specification";
        }

        return await validationOnAccept(input, inputs);
      },
    },
  };
}

export function openAIPluginManifestLocationQuestion(): TextInputQuestion {
  // export for unit test
  return {
    type: "text",
    name: QuestionNames.OpenAIPluginDomain,
    cliShortName: "d",
    title: getLocalizedString("core.createProjectQuestion.AIPluginManifest.title"),
    placeholder: getLocalizedString("core.createProjectQuestion.AIPluginManifest.placeholder"),
    cliDescription: "OpenAI plugin website domain.",
    forgetLastValue: true,
    validation: {
      validFunc: (input: string): Promise<string | undefined> => {
        const pattern = /(https?:\/\/)?([a-z0-9-]+(\.[a-z0-9-]+)*)(:[0-9]{1,5})?(\/)?$/i;
        const match = pattern.test(input);

        const result = match
          ? undefined
          : getLocalizedString("core.createProjectQuestion.invalidDomain.message");
        return Promise.resolve(result);
      },
    },
    additionalValidationOnAccept: {
      validFunc: async (input: string, inputs?: Inputs): Promise<string | undefined> => {
        let manifest;

        try {
          manifest = await OpenAIPluginManifestHelper.loadOpenAIPluginManifest(input);
          inputs!.openAIPluginManifest = manifest;
        } catch (e) {
          const error = assembleError(e);
          return error.message;
        }

        const context = createContextV3();
        try {
          const res = await listOperations(
            context,
            manifest,
            inputs![QuestionNames.ApiSpecLocation],
            undefined,
            true,
            true
          );
          if (res.isOk()) {
            inputs!.supportedApisFromApiSpec = res.value;
          } else {
            const errors = res.error;
            if (inputs?.platform === Platform.CLI) {
              return errors.map((e) => e.content).join("\n");
            }
            if (
              errors.length === 1 &&
              errors[0].content.length <= maximumLengthOfDetailsErrorMessageInInputBox
            ) {
              return errors[0].content;
            } else {
              return inputs!.platform === Platform.VSCode
                ? getLocalizedString(
                    "core.createProjectQuestion.openAiPluginManifest.multipleValidationErrors.vscode.message"
                  )
                : getLocalizedString(
                    "core.createProjectQuestion.openAiPluginManifest.multipleValidationErrors.message"
                  );
            }
          }
        } catch (e) {
          const error = assembleError(e);
          throw error;
        }
      },
    },
  };
}

export function apiOperationQuestion(includeExistingAPIs = true): MultiSelectQuestion {
  // export for unit test
  return {
    type: "multiSelect",
    name: QuestionNames.ApiOperation,
    title: getLocalizedString("core.createProjectQuestion.apiSpec.operation.title"),
    cliDescription: "Specifies API(s) to be used in Copilot plugin.",
    cliShortName: "o",
    placeholder: includeExistingAPIs
      ? getLocalizedString("core.createProjectQuestion.apiSpec.operation.placeholder")
      : getLocalizedString("core.createProjectQuestion.apiSpec.operation.placeholder.skipExisting"),
    forgetLastValue: true,
    staticOptions: [],
    validation: {
      minItems: 1,
      maxItems: 10,
    },
    dynamicOptions: (inputs: Inputs) => {
      if (!inputs.supportedApisFromApiSpec) {
        throw new EmptyOptionError(QuestionNames.ApiOperation, "question");
      }

      const operations = inputs.supportedApisFromApiSpec;

      return operations;
    },
  };
}

function getCopilotPluginFeatureId(inputs: Inputs): string {
  if (CLIPlatforms.includes(inputs.platform)) {
    return inputs[QuestionNames.CopilotPluginDevelopment];
  } else {
    return inputs[QuestionNames.Capabilities];
  }
}

export function capabilitySubTree(): IQTreeNode {
  const node: IQTreeNode = {
    data: capabilityQuestion(),
    children: [
      {
        // Notification bot trigger sub-tree
        condition: { equals: CapabilityOptions.notificationBot().id },
        data: botTriggerQuestion(),
      },
      {
        // SPFx sub-tree
        condition: { equals: CapabilityOptions.SPFxTab().id },
        data: SPFxSolutionQuestion(),
        children: [
          {
            data: { type: "group" },
            children: [
              { data: SPFxPackageSelectQuestion() },
              { data: SPFxFrameworkQuestion() },
              { data: SPFxWebpartNameQuestion() },
            ],
            condition: { equals: "new" },
          },
          {
            data: SPFxImportFolderQuestion(),
            condition: { equals: "import" },
          },
        ],
      },
      {
        // office addin import sub-tree
        condition: { equals: CapabilityOptions.officeAddinImport().id },
        data: { type: "group", name: QuestionNames.OfficeAddinImport },
        children: [
          {
            data: {
              type: "folder",
              name: QuestionNames.OfficeAddinFolder,
              title: "Existing add-in project folder",
            },
          },
          {
            data: {
              type: "singleFile",
              name: QuestionNames.OfficeAddinManifest,
              title: "Select import project manifest file",
            },
          },
        ],
      },
      {
        // office addin other items sub-tree
        condition: {
          enum: CapabilityOptions.officeAddinItems().map((i) => i.id),
        },
        data: officeAddinHostingQuestion(),
      },
      {
        // Copilot plugin sub-tree (will show in CLI only)
        condition: (inputs: Inputs) => {
          return (
            CLIPlatforms.includes(inputs.platform) &&
            inputs[QuestionNames.Capabilities] === CapabilityOptions.copilotPluginCli().id
          );
        },
        data: copilotPluginDevelopmentQuestion(),
      },
      {
        // Copilot plugin from API spec or AI Plugin
        condition: (inputs: Inputs) => {
          return copilotPluginExistingApiOptionIds.includes(getCopilotPluginFeatureId(inputs));
        },
        data: { type: "group", name: QuestionNames.CopilotPluginExistingApi },
        children: [
          {
            condition: (inputs: Inputs) => {
              return (
                getCopilotPluginFeatureId(inputs) === CapabilityOptions.copilotPluginApiSpec().id
              );
            },
            data: apiSpecLocationQuestion(),
          },
          {
            condition: (inputs: Inputs) => {
              return (
                getCopilotPluginFeatureId(inputs) ===
                CapabilityOptions.copilotPluginOpenAIPlugin().id
              );
            },
            data: openAIPluginManifestLocationQuestion(),
          },
          {
            data: apiOperationQuestion(),
          },
        ],
      },
      {
        // programming language
        data: programmingLanguageQuestion(),
        condition: (inputs: Inputs) => {
          const copilotFeature = getCopilotPluginFeatureId(inputs);
          if (copilotFeature) {
            return !copilotPluginExistingApiOptionIds.includes(getCopilotPluginFeatureId(inputs));
          } else {
            return !!inputs[QuestionNames.Capabilities];
          }
        },
      },
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

export function createProjectQuestionNode(): IQTreeNode {
  const createProjectQuestion: IQTreeNode = {
    data: { type: "group" },
    children: [
      {
        condition: (inputs: Inputs) =>
          isCLIDotNetEnabled() && CLIPlatforms.includes(inputs.platform),
        data: runtimeQuestion(),
      },
      {
        condition: (inputs: Inputs) =>
          inputs.platform === Platform.VSCode || inputs.platform === Platform.CLI,
        data: projectTypeQuestion(),
        cliOptionDisabled: "self",
      },
      capabilitySubTree(),
      {
        condition: (inputs: Inputs) =>
          inputs.teamsAppFromTdp && isPersonalApp(inputs.teamsAppFromTdp),
        data: { type: "group", name: QuestionNames.RepalceTabUrl },
        cliOptionDisabled: "all", //CLI non interactive mode will ignore this option
        inputsDisabled: "all",
        children: [
          {
            condition: (inputs: Inputs) =>
              (inputs.teamsAppFromTdp?.staticTabs.filter((o: any) => !!o.websiteUrl) || []).length >
              0,
            data: selectTabWebsiteUrlQuestion(),
          },
          {
            condition: (inputs: Inputs) =>
              (inputs.teamsAppFromTdp?.staticTabs.filter((o: any) => !!o.contentUrl) || []).length >
              0,
            data: selectTabsContentUrlQuestion(),
          },
        ],
      },
      {
        condition: (inputs: Inputs) => {
          const appDef = inputs.teamsAppFromTdp as AppDefinition;
          return appDef && needBotCode(appDef);
        },
        data: selectBotIdsQuestion(),
        cliOptionDisabled: "all", //CLI non interactive mode will ignore this option
        inputsDisabled: "all",
      },
    ],
  };
  return createProjectQuestion;
}

export function createSampleProjectQuestionNode(): IQTreeNode {
  return {
    data: sampleSelectQuestion(), // for create sample command, sample name is argument
    children: [
      {
        data: folderQuestion(),
      },
    ],
  };
}

export function createProjectCliHelpNode(): IQTreeNode {
  const node = cloneDeep(createProjectQuestionNode());
  const deleteNames = [
    QuestionNames.ProjectType,
    QuestionNames.OfficeAddinImport,
    QuestionNames.OfficeAddinHost,
    QuestionNames.RepalceTabUrl,
    QuestionNames.ReplaceBotIds,
    QuestionNames.Samples,
  ];
  if (!isCLIDotNetEnabled()) {
    deleteNames.push(QuestionNames.Runtime);
  }
  if (!isCopilotPluginEnabled()) {
    deleteNames.push(QuestionNames.CopilotPluginExistingApi);
    deleteNames.push(QuestionNames.CopilotPluginDevelopment);
  }
  trimQuestionTreeForCliHelp(node, deleteNames);
  return node;
}

function trimQuestionTreeForCliHelp(node: IQTreeNode, deleteNames: string[]): void {
  if (node.children) {
    node.children = node.children.filter(
      (child) => !child.data.name || !deleteNames.includes(child.data.name)
    );
    for (const child of node.children) {
      trimQuestionTreeForCliHelp(child, deleteNames);
    }
  }
}

function pickSubTree(node: IQTreeNode, name: string): IQTreeNode | undefined {
  if (node.data.name === name) {
    return node;
  }
  let found;
  if (node.children) {
    for (const child of node.children) {
      found = pickSubTree(child, name);
      if (found) return found;
    }
  }
  return undefined;
}
