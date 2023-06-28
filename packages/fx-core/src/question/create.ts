import {
  FolderQuestion,
  FuncQuestion,
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
import {
  DevEnvironmentSetupError,
  PathAlreadyExistsError,
  RetrieveSPFxInfoError,
} from "../component/generator/spfx/error";
import { Constants } from "../component/generator/spfx/utils/constants";
import * as jsonschema from "jsonschema";
import * as path from "path";
import fs from "fs-extra";
import * as os from "os";
import projectsJsonData from "../component/generator/officeAddin/config/projectsJsonData";
import { getTemplate } from "../component/generator/officeAddin/question";
import { ConstantString } from "../common/constants";
import { convertToAlphanumericOnly } from "../common/utils";
import { SPFxGenerator } from "../component/generator/spfx/spfxGenerator";

export enum QuestionNames {
  Scratch = "scratch",
  AppName = "app-name",
  Folder = "folder",
  ProgrammingLanguage = "programming-language",
  ProjectType = "project-type",
  Capabilities = "capabilities",
  BotTrigger = "bot-host-type-trigger",
  Runtime = "runtime",
  SPFxSolution = "spfx-solution",
  SPFxInstallPackage = "spfx-install-latest-package",
  SPFxFramework = "spfx-framework-type",
  SPFxWebpartName = "spfx-webpart-name",
  SPFxFolder = "spfx-folder",
  OfficeAddinFolder = "addin-project-folder",
  OfficeAddinManifest = "addin-project-manifest",
  OfficeAddinTemplate = "addin-template-select",
  OfficeAddinHost = "addin-host",
  skipAppName = "skip-app-name",
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
    return officeAddinJsonData.getProjectTemplateNames().map((template) => ({
      id: template,
      label: getLocalizedString(officeAddinJsonData.getProjectDisplayName(template)),
      detail: getLocalizedString(officeAddinJsonData.getProjectDetails(template)),
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

function officeAddinHostingQuestion(): SingleSelectQuestion {
  const OfficeHostQuestion: SingleSelectQuestion = {
    type: "singleSelect",
    name: QuestionNames.OfficeAddinHost,
    title: "Add-in Host",
    staticOptions: [],
    dynamicOptions: async (inputs: Inputs): Promise<OptionItem[]> => {
      const template = getTemplate(inputs);
      const getHostTemplateNames = officeAddinJsonData.getHostTemplateNames(template);
      const options = getHostTemplateNames.map((host) => ({
        label: officeAddinJsonData.getHostDisplayName(host) as string,
        id: host,
      }));
      return options.length > 0 ? options : [{ label: "No Options", id: "No Options" }];
    },
    default: async (inputs: Inputs): Promise<string> => {
      const template = getTemplate(inputs);
      const options = officeAddinJsonData.getHostTemplateNames(template);
      return options[0] || "No Options";
    },
    skipSingleOption: true,
  };
  return OfficeHostQuestion;
}
const officeAddinJsonData = new projectsJsonData();

function programmingLanguageQuestion(): SingleSelectQuestion {
  const programmingLanguageQuestion: SingleSelectQuestion = {
    name: QuestionNames.ProgrammingLanguage,
    title: "Programming Language",
    type: "singleSelect",
    staticOptions: [
      { id: "javascript", label: "JavaScript" },
      { id: "typescript", label: "TypeScript" },
      { id: "csharp", label: "C#" },
    ],
    dynamicOptions: (inputs: Inputs): StaticOptions => {
      const runtime = getRuntime(inputs);
      // dotnet runtime only supports C#
      if (runtime === Runtime.dotnet) {
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
    },
    default: (inputs: Inputs) => {
      const runtime = getRuntime(inputs);
      // dotnet
      if (runtime === Runtime.dotnet) {
        return "csharp";
      }
      // office addin
      const projectType = inputs[QuestionNames.ProjectType];
      if (projectType === ProjectTypeOptions.outlookAddin().id) {
        const template = getTemplate(inputs);
        const options = officeAddinJsonData.getSupportedScriptTypes(template);
        return options[0] || "No Options";
      }
      // SPFx
      const capabilities = inputs[QuestionNames.Capabilities] as string;
      if (capabilities === CapabilityOptions.SPFxTab().id) {
        return "typescript";
      }
      // other
      return "javascript";
    },
    placeholder: (inputs: Inputs): string => {
      const runtime = getRuntime(inputs);
      // dotnet
      if (runtime === Runtime.dotnet) {
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

export function rootFolderQuestion(): FolderQuestion {
  return {
    type: "folder",
    name: QuestionNames.Folder,
    title: getLocalizedString("core.question.workspaceFolder.title"),
    placeholder: getLocalizedString("core.question.workspaceFolder.placeholder"),
    default: path.join(os.homedir(), ConstantString.RootFolder),
  };
}

export const AppNamePattern =
  '^(?=(.*[\\da-zA-Z]){2})[a-zA-Z][^"<>:\\?/*&|\u0000-\u001F]*[^"\\s.<>:\\?/*&|\u0000-\u001F]$';

export function appNameQuestion(): TextInputQuestion {
  const question: TextInputQuestion = {
    type: "text",
    name: QuestionNames.AppName,
    title: "Application name",
    default: (inputs: Inputs) => {
      const defaultName = !inputs.teamsAppFromTdp?.appName
        ? undefined
        : convertToAlphanumericOnly(inputs.teamsAppFromTdp?.appName);
      return defaultName;
    },
    validation: {
      validFunc: async (input: string, previousInputs?: Inputs): Promise<string | undefined> => {
        const schema = {
          pattern: AppNamePattern,
          maxLength: 30,
        };
        const appName = input as string;
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

function fillInAppNameFuncQuestion(): FuncQuestion {
  const q: FuncQuestion = {
    type: "func",
    name: QuestionNames.skipAppName,
    title: "Set app name to skip",
    func: async (inputs: Inputs) => {
      if (inputs[QuestionNames.SPFxSolution] == "import") {
        const solutionName = await SPFxGenerator.getSolutionName(inputs[QuestionNames.SPFxFolder]);
        if (solutionName) {
          inputs[QuestionNames.AppName] = solutionName;
          if (await fs.pathExists(path.join(inputs.folder, solutionName)))
            throw PathAlreadyExistsError(path.join(inputs.folder, solutionName));
        } else {
          throw RetrieveSPFxInfoError();
        }
      }
    },
  };
  return q;
}

export function createNewQuestion(inputs: Inputs): IQTreeNode {
  const root: IQTreeNode = {
    data: projectTypeQuestion(inputs),
    children: [
      {
        data: capabilityQuestion(inputs),
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
                children: [
                  {
                    // auto fill in "app-name" question
                    data: fillInAppNameFuncQuestion(),
                  },
                ],
              },
            ],
          },
          {
            // office addin import sub-tree
            condition: { equals: CapabilityOptions.officeAddinImport().id },
            data: { type: "group" },
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
            condition: { containsAny: CapabilityOptions.officeAddinItems().map((i) => i.id) },
            data: officeAddinHostingQuestion(),
          },
          {
            // programming language
            data: programmingLanguageQuestion(),
          },
          {
            // root folder
            data: rootFolderQuestion(),
          },
          {
            // app name
            data: appNameQuestion(),
          },
        ],
      },
    ],
  };
  return root;
}
