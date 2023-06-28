import {
  FolderQuestion,
  IQTreeNode,
  Inputs,
  OptionItem,
  Platform,
  SingleSelectQuestion,
  Stage,
  StaticOptions,
  TextInputQuestion,
} from "@microsoft/teamsfx-api";
import { isCLIDotNetEnabled } from "../common/featureFlags";
import { getLocalizedString } from "../common/localizeUtils";
import { Runtime } from "../component/constants";
import { isFromDevPortal } from "../component/developerPortalScaffoldUtils";
import {
  PackageSelectOptionsHelper,
  SPFxVersionOptionIds,
} from "../component/generator/spfx/utils/question-helper";
import { DevEnvironmentSetupError } from "../component/generator/spfx/error";
import { Constants } from "../component/generator/spfx/utils/constants";
import * as jsonschema from "jsonschema";
import * as path from "path";
import fs from "fs-extra";
import projectsJsonData from "../component/generator/officeAddin/config/projectsJsonData";

export enum QuestionNames {
  Scratch = "scratch",
  ProjectType = "project-type",
  Capabilities = "capabilities",
  BotTrigger = "bot-host-type-trigger",
  Runtime = "runtime",
  SPFxSolution = "spfx-solution",
  SPFxInstallPackage = "spfx-install-latest-package",
  SPFxFramework = "spfx-framework-type",
  SPFxWebpartName = "spfx-webpart-name",
  SPFxWebpartDesp = "spfx-webpart-desp",
  SPFxFolder = "spfx-folder",
}

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
  static tab(): OptionItem {
    return {
      id: "tab-type",
      label: `$(browser) ${getLocalizedString("core.TabOption.label")}`,
      detail: getLocalizedString("core.createProjectQuestion.projectType.tab.detail"),
    };
  }

  static bot(): OptionItem {
    return {
      id: "bot-type",
      label: `$(hubot) ${getLocalizedString("core.createProjectQuestion.projectType.bot.label")}`,
      detail: getLocalizedString("core.createProjectQuestion.projectType.bot.detail"),
    };
  }

  static me(): OptionItem {
    return {
      id: "me-type",
      label: `$(symbol-keyword) ${getLocalizedString("core.MessageExtensionOption.label")}`,
      detail: getLocalizedString("core.createProjectQuestion.projectType.messageExtension.detail"),
    };
  }

  static outlookAddin(): OptionItem {
    return {
      id: "outlook-addin-type",
      label: `$(mail) ${getLocalizedString(
        "core.createProjectQuestion.projectType.outlookAddin.label"
      )}`,
      detail: getLocalizedString("core.createProjectQuestion.projectType.outlookAddin.detail"),
    };
  }
}

export function scratchOrSampleQuestion(): SingleSelectQuestion {
  const staticOptions: OptionItem[] = ScratchOptions.all();
  return {
    type: "singleSelect",
    name: QuestionNames.Scratch,
    title: getLocalizedString("core.getCreateNewOrFromSampleQuestion.title"),
    staticOptions,
    default: ScratchOptions.yes().id,
    placeholder: getLocalizedString("core.getCreateNewOrFromSampleQuestion.placeholder"),
    skipSingleOption: true,
    forgetLastValue: true,
  };
}

export function projectTypeQuestion(inputs: Inputs): SingleSelectQuestion {
  const staticOptions: StaticOptions = [
    ProjectTypeOptions.bot(),
    ProjectTypeOptions.tab(),
    ProjectTypeOptions.me(),
  ];

  if (!isFromDevPortal(inputs)) {
    staticOptions.push(ProjectTypeOptions.outlookAddin());
  }

  return {
    name: QuestionNames.ProjectType,
    title: getLocalizedString("core.createProjectQuestion.title"),
    type: "singleSelect",
    staticOptions: staticOptions,
    placeholder: getLocalizedString("core.getCreateNewOrFromSampleQuestion.placeholder"),
    forgetLastValue: true,
  };
}

export class CapabilityOptions {
  // bot
  static basicBot(): OptionItem {
    return {
      id: "Bot",
      label: `${getLocalizedString("core.BotNewUIOption.label")}`,
      cliName: "bot",
      detail: getLocalizedString("core.BotNewUIOption.detail"),
    };
  }
  static notificationBot(): OptionItem {
    return {
      // For default option, id and cliName must be the same
      id: "Notification",
      label: `${getLocalizedString("core.NotificationOption.label")}`,
      cliName: "notification",
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
      cliName: "command-bot",
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
      cliName: "workflow-bot",
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
      id: "TabNonSso",
      label: `${getLocalizedString("core.TabNonSso.label")}`,
      cliName: "tab-non-sso",
      detail: getLocalizedString("core.TabNonSso.detail"),
      description: getLocalizedString(
        "core.createProjectQuestion.option.description.worksInOutlookM365"
      ),
    };
  }

  static m365SsoLaunchPage(): OptionItem {
    return {
      id: "M365SsoLaunchPage",
      label: `${getLocalizedString("core.M365SsoLaunchPageOptionItem.label")}`,
      cliName: "sso-launch-page",
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
      cliName: "dashboard-tab",
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
      id: "TabSPFx",
      label: getLocalizedString("core.TabSPFxOption.labelNew"),
      cliName: "tab-spfx",
      description: getLocalizedString(
        "core.createProjectQuestion.option.description.worksInOutlookM365"
      ),
      detail: getLocalizedString("core.TabSPFxOption.detailNew"),
    };
  }

  //message extension
  static m365SearchMe(): OptionItem {
    return {
      id: "M365SearchApp",
      label: `${getLocalizedString("core.M365SearchAppOptionItem.label")}`,
      cliName: "search-app",
      detail: getLocalizedString("core.M365SearchAppOptionItem.detail"),
      description: getLocalizedString(
        "core.createProjectQuestion.option.description.worksInOutlook"
      ),
    };
  }

  static collectFormMe(): OptionItem {
    return {
      id: "MessagingExtension",
      label: `${getLocalizedString("core.MessageExtensionOption.labelNew")}`,
      cliName: "message-extension",
      detail: getLocalizedString("core.MessageExtensionOption.detail"),
    };
  }

  static bots(inputs?: Inputs): OptionItem[] {
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

  static mes(): OptionItem[] {
    return [CapabilityOptions.m365SearchMe(), CapabilityOptions.collectFormMe()];
  }

  static all(inputs?: Inputs): OptionItem[] {
    return [
      ...CapabilityOptions.bots(inputs),
      ...CapabilityOptions.tabs(),
      ...CapabilityOptions.mes(),
    ];
  }

  static officeAddinImport(): OptionItem {
    return {
      id: "import-addin-project",
      label: getLocalizedString("core.importAddin.label"),
      cliName: "import",
      detail: getLocalizedString("core.importAddin.detail"),
      description: getLocalizedString(
        "core.createProjectQuestion.option.description.previewOnWindow"
      ),
    };
  }

  static officeAddinItems(): OptionItem[] {
    const jsonData = new projectsJsonData();
    return jsonData.getProjectTemplateNames().map((template) => ({
      id: template,
      label: getLocalizedString(jsonData.getProjectDisplayName(template)),
      detail: getLocalizedString(jsonData.getProjectDetails(template)),
      description: getLocalizedString(
        "core.createProjectQuestion.option.description.previewOnWindow"
      ),
    }));
  }
}

export function capabilityQuestion(inputs: Inputs): SingleSelectQuestion {
  return {
    name: QuestionNames.Capabilities,
    title: getLocalizedString("core.createProjectQuestion.projectType.bot.title"),
    type: "singleSelect",
    staticOptions: CapabilityOptions.all(inputs),
    dynamicOptions: (inputs: Inputs) => {
      const projectType = inputs[QuestionNames.ProjectType];
      if (projectType === ProjectTypeOptions.bot().id) {
        return CapabilityOptions.bots(inputs);
      } else if (projectType === ProjectTypeOptions.tab().id) {
        return CapabilityOptions.tabs();
      } else if (projectType === ProjectTypeOptions.me().id) {
        return CapabilityOptions.mes();
      } else if (projectType === ProjectTypeOptions.outlookAddin().id) {
        return [...CapabilityOptions.officeAddinItems(), CapabilityOptions.officeAddinImport()];
      }
      return [];
    },
    placeholder: getLocalizedString("core.getCreateNewOrFromSampleQuestion.placeholder"),
    forgetLastValue: true,
  };
}

enum HostType {
  AppService = "app-service",
  Functions = "azure-functions",
}

export const NotificationTriggers = {
  HTTP: "http",
  TIMER: "timer",
} as const;

export type NotificationTrigger = typeof NotificationTriggers[keyof typeof NotificationTriggers];

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
      cliName: getLocalizedString("plugins.bot.triggers.http-restify.cliName"),
      description: getLocalizedString("plugins.bot.triggers.http-restify.description"),
      detail: getLocalizedString("plugins.bot.triggers.http-restify.detail"),
    };
  }
  static appServiceForVS(): HostTypeTriggerOptionItem {
    return {
      id: "http-webapi",
      hostType: HostType.AppService,
      label: getLocalizedString("plugins.bot.triggers.http-webapi.label"),
      cliName: getLocalizedString("plugins.bot.triggers.http-webapi.cliName"),
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
      cliName: getLocalizedString("plugins.bot.triggers.timer-functions.cliName"),
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
      cliName: getLocalizedString("plugins.bot.triggers.http-and-timer-functions.cliName"),
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
      cliName: getLocalizedString("plugins.bot.triggers.http-functions.cliName"),
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

function getRuntime(inputs: Inputs): Runtime {
  let runtime = Runtime.nodejs;
  if (isCLIDotNetEnabled()) {
    runtime = inputs[QuestionNames.Runtime] || runtime;
  } else {
    if (inputs?.platform === Platform.VS) {
      runtime = Runtime.dotnet;
    }
  }
  return runtime;
}

export function botTriggerQuestion(): SingleSelectQuestion {
  return {
    name: QuestionNames.BotTrigger,
    title: getLocalizedString("plugins.bot.questionHostTypeTrigger.title"),
    type: "singleSelect",
    staticOptions: NotificationTriggerOptions.all(),
    dynamicOptions: (inputs: Inputs) => {
      const runtime = getRuntime(inputs);
      return [
        runtime === Runtime.dotnet
          ? NotificationTriggerOptions.appServiceForVS()
          : NotificationTriggerOptions.appService(),
        ...NotificationTriggerOptions.functionsTriggers(),
      ];
    },
    default: (inputs: Inputs) => {
      const runtime = getRuntime(inputs);
      return runtime === Runtime.dotnet
        ? NotificationTriggerOptions.appServiceForVS().id
        : NotificationTriggerOptions.appService().id;
    },
    placeholder: getLocalizedString("plugins.bot.questionHostTypeTrigger.placeholder"),
  };
}

export function SPFxSolutionQuestion(): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: QuestionNames.SPFxSolution,
    title: getLocalizedString("plugins.spfx.questions.spfxSolution.title"),
    staticOptions: [
      { id: "new", label: getLocalizedString("plugins.spfx.questions.spfxSolution.createNew") },
      {
        id: "import",
        label: getLocalizedString("plugins.spfx.questions.spfxSolution.importExisting"),
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
    staticOptions: [],
    placeholder: getLocalizedString("plugins.spfx.questions.packageSelect.placeholder"),
    dynamicOptions: async (inputs: Inputs): Promise<OptionItem[]> => {
      await PackageSelectOptionsHelper.loadOptions();
      return PackageSelectOptionsHelper.getOptions();
    },
    default: SPFxVersionOptionIds.installLocally,
    validation: {
      validFunc: async (input: string): Promise<string | undefined> => {
        if (input === SPFxVersionOptionIds.globalPackage) {
          const hasPackagesInstalled = PackageSelectOptionsHelper.checkGlobalPackages();
          if (!hasPackagesInstalled) {
            throw DevEnvironmentSetupError();
          }
        }
        return undefined;
      },
    },
  };
}

export function SPFxFrameworkQuestion(): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: QuestionNames.SPFxFramework,
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
    title: "Web Part Name",
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
export function SPFxImportFolderQuestion(): FolderQuestion {
  return {
    type: "folder",
    name: QuestionNames.SPFxFolder,
    title: getLocalizedString("core.spfxFolder.title"),
    placeholder: getLocalizedString("core.spfxFolder.placeholder"),
  };
}

export function questionTreeForVSC(inputs: Inputs): IQTreeNode {
  const root: IQTreeNode = {
    data: projectTypeQuestion(inputs),
    children: [
      {
        data: capabilityQuestion(inputs),
        children: [
          {
            data: botTriggerQuestion(),
            condition: { equals: CapabilityOptions.notificationBot().id },
          },
          {
            data: SPFxSolutionQuestion(),
            condition: { equals: CapabilityOptions.SPFxTab().id },
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
                condition: { equals: "new" },
              },
            ],
          },
        ],
      },
    ],
  };
  return root;
}
