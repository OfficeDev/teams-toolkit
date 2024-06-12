// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ApiOperation,
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
import { Correlator } from "../common/correlator";
import {
  FeatureFlags,
  featureFlagManager,
  isApiCopilotPluginEnabled,
  isCLIDotNetEnabled,
  isChatParticipantEnabled,
  isCopilotPluginEnabled,
  isOfficeJSONAddinEnabled,
} from "../common/featureFlags";
import { createContext } from "../common/globalVars";
import { getLocalizedString } from "../common/localizeUtils";
import { sampleProvider } from "../common/samples";
import { convertToAlphanumericOnly, isValidHttpUrl } from "../common/stringUtils";
import { AppDefinition } from "../component/driver/teamsApp/interfaces/appdefinitions/appDefinition";
import { StaticTab } from "../component/driver/teamsApp/interfaces/appdefinitions/staticTab";
import {
  isBot,
  isBotAndBotBasedMessageExtension,
  isBotBasedMessageExtension,
  isPersonalApp,
  needBotCode,
  needTabAndBotCode,
  needTabCode,
} from "../component/driver/teamsApp/utils/utils";
import { listOperations } from "../component/generator/copilotPlugin/helper";
import {
  IOfficeAddinHostConfig,
  OfficeAddinProjectConfig,
} from "../component/generator/officeXMLAddin/projectConfig";
import { DevEnvironmentSetupError } from "../component/generator/spfx/error";
import { Constants } from "../component/generator/spfx/utils/constants";
import { Utils } from "../component/generator/spfx/utils/utils";
import { EmptyOptionError, FileNotFoundError, assembleError } from "../error";
import {
  ApiAuthOptions,
  AppNamePattern,
  CapabilityOptions,
  CliQuestionName,
  CustomCopilotAssistantOptions,
  CustomCopilotRagOptions,
  MeArchitectureOptions,
  NotificationTriggerOptions,
  OfficeAddinHostOptions,
  ProgrammingLanguage,
  ProjectTypeOptions,
  QuestionNames,
  RuntimeOptions,
  SPFxVersionOptionIds,
  capabilitiesHavePythonOption,
  getRuntime,
} from "./constants";

export function projectTypeQuestion(): SingleSelectQuestion {
  const staticOptions: StaticOptions = [
    ProjectTypeOptions.bot(Platform.CLI),
    ProjectTypeOptions.tab(Platform.CLI),
    ProjectTypeOptions.me(Platform.CLI),
    ProjectTypeOptions.officeXMLAddin(Platform.CLI),
    ProjectTypeOptions.officeAddin(Platform.CLI),
    ProjectTypeOptions.outlookAddin(Platform.CLI),
  ];
  return {
    name: QuestionNames.ProjectType,
    title: getLocalizedString("core.createProjectQuestion.title"),
    type: "singleSelect",
    staticOptions: staticOptions,
    dynamicOptions: (inputs: Inputs) => {
      const staticOptions: OptionItem[] = [];

      if (
        CLIPlatforms.includes(inputs.platform) &&
        featureFlagManager.getBooleanValue(FeatureFlags.CustomizeGpt)
      ) {
        // Show in CLI only
        staticOptions.push(ProjectTypeOptions.customizeGpt());
      }

      if (isApiCopilotPluginEnabled()) {
        staticOptions.push(ProjectTypeOptions.copilotPlugin(inputs.platform));
      }
      staticOptions.push(ProjectTypeOptions.customCopilot(inputs.platform));
      staticOptions.push(
        ProjectTypeOptions.bot(inputs.platform),
        ProjectTypeOptions.tab(inputs.platform),
        ProjectTypeOptions.me(inputs.platform)
      );

      if (isFromDevPortal(inputs)) {
        const projectType = getProjectTypeAndCapability(inputs.teamsAppFromTdp)?.projectType;
        if (projectType) {
          return [projectType];
        }
      } else {
        if (inputs.agent === "office") {
          //only for @office agent, officeXMLAddin are supported
          staticOptions.push(ProjectTypeOptions.officeXMLAddin(inputs.platform));
        } else {
          if (isOfficeJSONAddinEnabled()) {
            staticOptions.push(ProjectTypeOptions.officeAddin(inputs.platform));
          } else {
            staticOptions.push(ProjectTypeOptions.outlookAddin(inputs.platform));
          }
        }
      }

      if (
        inputs.platform === Platform.VSCode &&
        isChatParticipantEnabled() &&
        !inputs.teamsAppFromTdp
      ) {
        staticOptions.push(ProjectTypeOptions.startWithGithubCopilot());
      }
      return staticOptions;
    },
    placeholder: getLocalizedString("core.getCreateNewOrFromSampleQuestion.placeholder"),
    forgetLastValue: true,
    skipSingleOption: true,
  };
}

export function getProjectTypeAndCapability(
  teamsApp: AppDefinition
): { projectType: string; templateId: string } | undefined {
  // tab with bot, tab with message extension, tab with bot and message extension
  if (needTabAndBotCode(teamsApp)) {
    return { projectType: "tab-bot-type", templateId: CapabilityOptions.nonSsoTabAndBot().id };
  }

  // tab only
  if (needTabCode(teamsApp)) {
    return { projectType: "tab-type", templateId: CapabilityOptions.nonSsoTab().id };
  }

  // bot and message extension
  if (isBotAndBotBasedMessageExtension(teamsApp)) {
    return { projectType: "bot-me-type", templateId: CapabilityOptions.botAndMe().id };
  }

  // bot based message extension
  if (isBotBasedMessageExtension(teamsApp)) {
    return { projectType: "me-type", templateId: CapabilityOptions.me().id };
  }

  // bot
  if (isBot(teamsApp)) {
    return { projectType: "bot-type", templateId: CapabilityOptions.basicBot().id };
  }

  return undefined;
}

export function isFromDevPortal(inputs: Inputs | undefined): boolean {
  return !!inputs?.teamsAppFromTdp;
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
        case ProjectTypeOptions.officeAddin().id:
        case ProjectTypeOptions.officeXMLAddin().id: {
          switch (inputs[QuestionNames.OfficeAddinHost]) {
            case OfficeAddinHostOptions.outlook().id:
              return getLocalizedString(
                "core.createProjectQuestion.projectType.outlookAddin.title"
              );
            case OfficeAddinHostOptions.word().id:
              return getLocalizedString(
                "core.createProjectQuestion.officeXMLAddin.word.create.title"
              );
            case OfficeAddinHostOptions.excel().id:
              return getLocalizedString(
                "core.createProjectQuestion.officeXMLAddin.excel.create.title"
              );
            case OfficeAddinHostOptions.powerpoint().id:
              return getLocalizedString(
                "core.createProjectQuestion.officeXMLAddin.powerpoint.create.title"
              );
          }
          return getLocalizedString("core.createProjectQuestion.projectType.officeAddin.title");
        }
        case ProjectTypeOptions.copilotPlugin().id:
          return getLocalizedString("core.createProjectQuestion.projectType.copilotPlugin.title");
        case ProjectTypeOptions.customCopilot().id:
          return getLocalizedString("core.createProjectQuestion.projectType.customCopilot.title");
        case ProjectTypeOptions.customizeGpt().id:
          return getLocalizedString("core.createProjectQuestion.declarativeCopilotType.title");
        default:
          return getLocalizedString("core.createCapabilityQuestion.titleNew");
      }
    },
    cliDescription: "Specifies the Microsoft Teams App capability.",
    cliName: CliQuestionName.Capability,
    cliShortName: "c",
    cliChoiceListCommand: "teamsapp list templates",
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
      } else if (ProjectTypeOptions.officeAddinAllIds().includes(projectType)) {
        return CapabilityOptions.officeAddinDynamicCapabilities(
          projectType,
          inputs[QuestionNames.OfficeAddinHost]
        );
      } else if (projectType === ProjectTypeOptions.copilotPlugin().id) {
        return CapabilityOptions.copilotPlugins();
      } else if (projectType === ProjectTypeOptions.customCopilot().id) {
        return CapabilityOptions.customCopilots();
      } else if (projectType === ProjectTypeOptions.customizeGpt().id) {
        return CapabilityOptions.customizeGptOptions();
      } else {
        return CapabilityOptions.all(inputs);
      }
    },
    placeholder: (inputs: Inputs) => {
      if (inputs[QuestionNames.ProjectType] === ProjectTypeOptions.copilotPlugin().id) {
        return getLocalizedString(
          "core.createProjectQuestion.projectType.copilotPlugin.placeholder"
        );
      } else if (inputs[QuestionNames.ProjectType] === ProjectTypeOptions.customCopilot().id) {
        return getLocalizedString(
          "core.createProjectQuestion.projectType.customCopilot.placeholder"
        );
      }
      return getLocalizedString("core.createCapabilityQuestion.placeholder");
    },
    forgetLastValue: true,
    skipSingleOption: true,
  };
}

export function meArchitectureQuestion(): SingleSelectQuestion {
  return {
    name: QuestionNames.MeArchitectureType,
    title: getLocalizedString("core.createProjectQuestion.meArchitecture.title"),
    cliDescription: "Architecture of Search Based Message Extension.",
    cliShortName: "m",
    type: "singleSelect",
    staticOptions: MeArchitectureOptions.staticAll(),
    dynamicOptions: (inputs: Inputs) => {
      return MeArchitectureOptions.all();
    },
    default: MeArchitectureOptions.newApi().id,
    placeholder: getLocalizedString(
      "core.createProjectQuestion.projectType.copilotPlugin.placeholder"
    ),
    forgetLastValue: true,
    skipSingleOption: true,
  };
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

export function SPFxFrameworkQuestion(): SingleSelectQuestion {
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

export function officeAddinHostingQuestion(): SingleSelectQuestion {
  return {
    name: QuestionNames.OfficeAddinHost,
    title: getLocalizedString("core.createProjectQuestion.officeXMLAddin.create.title"),
    type: "singleSelect",
    staticOptions: OfficeAddinHostOptions.all(),
  };
}

export function officeAddinFrameworkQuestion(): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: QuestionNames.OfficeAddinFramework,
    cliShortName: "f",
    cliDescription: "Framework for WXP extension.",
    title: getLocalizedString("core.createProjectQuestion.projectType.officeAddin.framework.title"),
    dynamicOptions: getAddinFrameworkOptions,
    staticOptions: [
      { id: "default", label: "Default" },
      { id: "react", label: "React" },
    ],
    placeholder: getLocalizedString(
      "core.createProjectQuestion.projectType.officeAddin.framework.placeholder"
    ),
    skipSingleOption: true,
  };
}

export function getAddinFrameworkOptions(inputs: Inputs): OptionItem[] {
  const projectType = inputs[QuestionNames.ProjectType];
  const capabilities = inputs[QuestionNames.Capabilities];
  const host = inputs[QuestionNames.OfficeAddinHost];
  if (
    projectType === ProjectTypeOptions.outlookAddin().id ||
    (projectType === ProjectTypeOptions.officeXMLAddin().id &&
      host === OfficeAddinHostOptions.outlook().id)
  ) {
    return [{ id: "default", label: "Default" }];
  } else if (
    (projectType === ProjectTypeOptions.officeAddin().id &&
      capabilities === CapabilityOptions.officeContentAddin().id) ||
    capabilities === CapabilityOptions.officeAddinImport().id
  ) {
    return [{ id: "default", label: "Default" }];
  } else {
    return [
      { id: "default", label: "Default" },
      { id: "react", label: "React" },
    ];
  }
}

/**
 * when project-type=office-addin-type(office-addin-framework-type=default or react), use selected value;
 * when project-type=outlook-addin-type, no framework to select, office-addin-framework-type=default_old
 * when project-type=office-xml-addin-type, no framework to select, office-addin-framework-type=default_old
 */
export function getOfficeAddinFramework(inputs: Inputs): string {
  const projectType = inputs[QuestionNames.ProjectType];
  if (
    projectType === ProjectTypeOptions.officeAddin().id &&
    inputs[QuestionNames.OfficeAddinFramework]
  ) {
    return inputs[QuestionNames.OfficeAddinFramework];
  } else if (
    (projectType === ProjectTypeOptions.officeXMLAddin().id &&
      inputs[QuestionNames.OfficeAddinHost] === OfficeAddinHostOptions.outlook().id) ||
    projectType === ProjectTypeOptions.outlookAddin().id
  ) {
    return "default_old";
  } else {
    return "default";
  }
}
export function getOfficeAddinTemplateConfig(
  projectType: string,
  addinHost?: string
): IOfficeAddinHostConfig {
  if (
    projectType === ProjectTypeOptions.officeXMLAddin().id &&
    addinHost &&
    addinHost !== OfficeAddinHostOptions.outlook().id
  ) {
    return OfficeAddinProjectConfig[addinHost];
  }
  return OfficeAddinProjectConfig["json"];
}
export function getLanguageOptions(inputs: Inputs): OptionItem[] {
  const runtime = getRuntime(inputs);
  // dotnet runtime only supports C#
  if (runtime === RuntimeOptions.DotNet().id) {
    return [{ id: ProgrammingLanguage.CSharp, label: "C#" }];
  }
  const capabilities = inputs[QuestionNames.Capabilities] as string;
  const host = inputs[QuestionNames.OfficeAddinHost] as string;

  // office addin supports language defined in officeAddinJsonData
  const projectType = inputs[QuestionNames.ProjectType];
  if (ProjectTypeOptions.officeAddinAllIds().includes(projectType)) {
    if (capabilities.endsWith("-manifest")) {
      return [{ id: ProgrammingLanguage.JS, label: "JavaScript" }];
    }
    if (
      projectType === ProjectTypeOptions.outlookAddin().id ||
      (projectType === ProjectTypeOptions.officeXMLAddin().id &&
        host === OfficeAddinHostOptions.outlook().id)
    ) {
      return [{ id: ProgrammingLanguage.TS, label: "TypeScript" }];
    }
    const officeXMLAddinLangConfig = getOfficeAddinTemplateConfig(projectType, host)[capabilities]
      .framework["default"];
    const officeXMLAddinLangOptions = [];
    if (!!officeXMLAddinLangConfig.typescript)
      officeXMLAddinLangOptions.push({ id: ProgrammingLanguage.TS, label: "TypeScript" });
    if (!!officeXMLAddinLangConfig.javascript)
      officeXMLAddinLangOptions.push({ id: ProgrammingLanguage.JS, label: "JavaScript" });
    return officeXMLAddinLangOptions;
  }

  if (capabilities === CapabilityOptions.SPFxTab().id) {
    // SPFx only supports typescript
    return [{ id: ProgrammingLanguage.TS, label: "TypeScript" }];
  } else if (
    capabilitiesHavePythonOption.includes(
      inputs[capabilities] ? inputs[capabilities] : capabilities
    ) &&
    !(
      capabilities == CapabilityOptions.customCopilotRag().id &&
      (inputs[CapabilityOptions.customCopilotRag().id] ==
        CustomCopilotRagOptions.microsoft365().id ||
        inputs[CapabilityOptions.customCopilotRag().id] == CustomCopilotRagOptions.customApi().id)
    )
  ) {
    // support python language
    return [
      { id: ProgrammingLanguage.JS, label: "JavaScript" },
      { id: ProgrammingLanguage.TS, label: "TypeScript" },
      {
        id: ProgrammingLanguage.PY,
        label: "Python",
        detail: "",
        description: getLocalizedString("core.createProjectQuestion.option.description.preview"),
      },
    ];
  } else {
    // other cases
    return [
      { id: ProgrammingLanguage.JS, label: "JavaScript" },
      { id: ProgrammingLanguage.TS, label: "TypeScript" },
    ];
  }
}

export function programmingLanguageQuestion(): SingleSelectQuestion {
  const programmingLanguageQuestion: SingleSelectQuestion = {
    name: QuestionNames.ProgrammingLanguage,
    cliShortName: "l",
    title: getLocalizedString("core.ProgrammingLanguageQuestion.title"),
    type: "singleSelect",
    staticOptions: [
      { id: ProgrammingLanguage.JS, label: "JavaScript" },
      { id: ProgrammingLanguage.TS, label: "TypeScript" },
      { id: ProgrammingLanguage.CSharp, label: "C#" },
      { id: ProgrammingLanguage.PY, label: "Python" },
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

      const capabilities = inputs[QuestionNames.Capabilities] as string;

      // // office addin
      // const projectType = inputs[QuestionNames.ProjectType];
      // if (projectType === ProjectTypeOptions.outlookAddin().id) {
      //   const template = getTemplate(inputs);
      //   const options = officeAddinJsonData.getSupportedScriptTypesNew(template);
      //   return options[0] || "No Options";
      // }

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

export async function getSolutionName(spfxFolder: string): Promise<string | undefined> {
  const yoInfoPath = path.join(spfxFolder, Constants.YO_RC_FILE);
  if (await fs.pathExists(yoInfoPath)) {
    const yoInfo = await fs.readJson(yoInfoPath);
    if (yoInfo["@microsoft/generator-sharepoint"]) {
      return yoInfo["@microsoft/generator-sharepoint"][Constants.YO_RC_SOLUTION_NAME];
    } else {
      return undefined;
    }
  } else {
    throw new FileNotFoundError(Constants.PLUGIN_NAME, yoInfoPath, Constants.IMPORT_HELP_LINK);
  }
}
export function appNameQuestion(): TextInputQuestion {
  const question: TextInputQuestion = {
    type: "text",
    name: QuestionNames.AppName,
    cliShortName: "n",
    title: getLocalizedString("core.question.appName.title"),
    required: true,
    default: async (inputs: Inputs) => {
      let defaultName = undefined;
      if (inputs.teamsAppFromTdp?.appName) {
        defaultName = convertToAlphanumericOnly(inputs.teamsAppFromTdp?.appName);
      } else if (inputs[QuestionNames.SPFxSolution] == "import") {
        defaultName = await getSolutionName(inputs[QuestionNames.SPFxFolder]);
      }
      return defaultName;
    },
    validation: {
      validFunc: async (input: string, previousInputs?: Inputs): Promise<string | undefined> => {
        const schema = {
          pattern: AppNamePattern,
          maxLength: 30,
        };
        if (input.length === 25) {
          // show warning notification because it may exceed the Teams app name max length after appending suffix
          const context = createContext();
          if (previousInputs?.platform === Platform.VSCode) {
            void context.userInteraction.showMessage(
              "warn",
              getLocalizedString("core.QuestionAppName.validation.lengthWarning"),
              false
            );
          } else {
            context.logProvider.warning(
              getLocalizedString("core.QuestionAppName.validation.lengthWarning")
            );
          }
        }
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
    placeholder: getLocalizedString("core.question.appName.placeholder"),
  };
  return question;
}

function sampleSelectQuestion(): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: QuestionNames.Samples,
    cliName: "sample-name",
    cliDescription: "Specifies the Microsoft Teams App sample name.",
    cliChoiceListCommand: "teamsapp list samples",
    skipValidation: true,
    cliType: "argument",
    title: getLocalizedString("core.SampleSelect.title"),
    staticOptions: [
      "hello-world-tab-with-backend",
      "graph-toolkit-contact-exporter",
      "bot-sso",
      "todo-list-SPFx",
      "hello-world-in-meeting",
      "todo-list-with-Azure-backend-M365",
      "NPM-search-connector-M365",
      "bot-proactive-messaging-teamsfx",
      "adaptive-card-notification",
      "incoming-webhook-notification",
      "stocks-update-notification-bot",
      "query-org-user-with-message-extension-sso",
      "team-central-dashboard",
      "graph-connector-app",
      "graph-toolkit-one-productivity-hub",
      "todo-list-with-Azure-backend",
      "share-now",
      "hello-world-teams-tab-and-outlook-add-in",
      "outlook-add-in-set-signature",
      "developer-assist-dashboard",
      "live-share-dice-roller",
      "teams-chef-bot",
      "spfx-productivity-dashboard",
      "react-retail-dashboard",
      "sso-enabled-tab-via-apim-proxy",
      "large-scale-notification",
      "graph-connector-bot",
    ], //using a static list instead of dynamic list to avoid the delay of fetching sample list for CLL_HELP
    dynamicOptions: async () => {
      return (await sampleProvider.SampleCollection).samples.map((sample) => {
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
  const correlationId = Correlator.getId(); // This is a workaround for VSCode which will lose correlation id when user accepts the value.
  const validationOnAccept = async (
    input: string,
    inputs?: Inputs
  ): Promise<string | undefined> => {
    try {
      if (!inputs) {
        throw new Error("inputs is undefined"); // should never happen
      }
      const context = createContext();
      const res = await listOperations(
        context,
        input.trim(),
        inputs,
        includeExistingAPIs,
        false,
        inputs.platform === Platform.VSCode ? correlationId : undefined
      );
      if (res.isOk()) {
        inputs.supportedApisFromApiSpec = res.value;
      } else {
        const errors = res.error;
        if (inputs.platform === Platform.CLI) {
          return errors.map((e) => e.content).join("\n");
        }
        if (
          errors.length === 1 &&
          errors[0].content.length <= maximumLengthOfDetailsErrorMessageInInputBox
        ) {
          return errors[0].content;
        } else {
          return getLocalizedString(
            "core.createProjectQuestion.apiSpec.multipleValidationErrors.vscode.message"
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
    cliDescription: "OpenAPI description document location.",
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
          const result = isValidHttpUrl(input.trim())
            ? undefined
            : inputs?.platform === Platform.CLI
            ? "Please enter a valid HTTP URL without authentication to access your OpenAPI description document or enter a file path of your local OpenAPI description document."
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
        if (!isValidHttpUrl(input.trim()) && !(await fs.pathExists(input.trim()))) {
          return "Please enter a valid HTTP URL without authentication to access your OpenAPI description document or enter a file path of your local OpenAPI description document.";
        }

        return await validationOnAccept(input, inputs);
      },
    },
  };
}

export function apiAuthQuestion(): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: QuestionNames.ApiAuth,
    title: getLocalizedString("core.createProjectQuestion.apiMessageExtensionAuth.title"),
    placeholder: getLocalizedString(
      "core.createProjectQuestion.apiMessageExtensionAuth.placeholder"
    ),
    cliDescription: "The authentication type for the API.",
    staticOptions: ApiAuthOptions.all(),
    dynamicOptions: (inputs: Inputs) => {
      const options: OptionItem[] = [ApiAuthOptions.none()];
      if (inputs[QuestionNames.MeArchitectureType] === MeArchitectureOptions.newApi().id) {
        options.push(ApiAuthOptions.apiKey(), ApiAuthOptions.microsoftEntra());
      } else if (
        featureFlagManager.getBooleanValue(FeatureFlags.CopilotAuth) &&
        inputs[QuestionNames.Capabilities] === CapabilityOptions.copilotPluginNewApi().id
      ) {
        options.push(ApiAuthOptions.apiKey(), ApiAuthOptions.oauth());
      }
      return options;
    },
    default: ApiAuthOptions.none().id,
  };
}

export function apiOperationQuestion(
  includeExistingAPIs = true,
  isAddPlugin = false
): MultiSelectQuestion {
  // export for unit test
  let placeholder = "";

  const isPlugin = (inputs?: Inputs): boolean => {
    return (
      isAddPlugin ||
      (!!inputs &&
        inputs[QuestionNames.Capabilities] === CapabilityOptions.copilotPluginApiSpec().id)
    );
  };

  return {
    type: "multiSelect",
    name: QuestionNames.ApiOperation,
    title: (inputs: Inputs) => {
      return isPlugin(inputs)
        ? getLocalizedString("core.createProjectQuestion.apiSpec.copilotOperation.title")
        : getLocalizedString("core.createProjectQuestion.apiSpec.operation.title");
    },
    cliDescription: isAddPlugin
      ? "Select operation(s) Copilot can interact with."
      : "Select operation(s) Teams can interact with.",
    cliShortName: "o",
    placeholder: (inputs: Inputs) => {
      const isPlugin =
        inputs[QuestionNames.Capabilities] === CapabilityOptions.copilotPluginApiSpec().id;
      if (!includeExistingAPIs) {
        placeholder = getLocalizedString(
          "core.createProjectQuestion.apiSpec.operation.placeholder.skipExisting"
        );
      } else if (isPlugin) {
        placeholder = ""; // TODO: add placeholder for api plugin
      } else {
        placeholder = getLocalizedString(
          "core.createProjectQuestion.apiSpec.operation.apikey.placeholder"
        );
      }

      return placeholder;
    },
    forgetLastValue: true,
    staticOptions: [],
    validation: {
      validFunc: (input: string[], inputs?: Inputs): string | undefined => {
        if (!inputs) {
          throw new Error("inputs is undefined"); // should never happen
        }
        if (
          input.length < 1 ||
          (input.length > 10 &&
            inputs[QuestionNames.CustomCopilotRag] != CustomCopilotRagOptions.customApi().id)
        ) {
          return getLocalizedString(
            "core.createProjectQuestion.apiSpec.operation.invalidMessage",
            input.length,
            10
          );
        }
        const operations: ApiOperation[] = inputs.supportedApisFromApiSpec as ApiOperation[];

        const authNames: Set<string> = new Set();
        const serverUrls: Set<string> = new Set();
        for (const inputItem of input) {
          const operation = operations.find((op) => op.id === inputItem);
          if (operation) {
            if (operation.data.authName) {
              authNames.add(operation.data.authName);
              serverUrls.add(operation.data.serverUrl);
            }
          }
        }

        if (authNames.size > 1) {
          return getLocalizedString(
            "core.createProjectQuestion.apiSpec.operation.multipleAuth",
            Array.from(authNames).join(", ")
          );
        }

        if (serverUrls.size > 1) {
          return getLocalizedString(
            "core.createProjectQuestion.apiSpec.operation.multipleServer",
            Array.from(serverUrls).join(", ")
          );
        }

        const authApi = operations.find((api) => !!api.data.authName && input.includes(api.id));
        if (authApi) {
          inputs.apiAuthData = authApi.data;
        }
      },
    },
    dynamicOptions: (inputs: Inputs) => {
      if (!inputs.supportedApisFromApiSpec) {
        throw new EmptyOptionError(QuestionNames.ApiOperation, "question");
      }

      const operations = inputs.supportedApisFromApiSpec as ApiOperation[];

      return operations;
    },
  };
}

function customCopilotRagQuestion(): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: QuestionNames.CustomCopilotRag,
    title: getLocalizedString("core.createProjectQuestion.capability.customCopilotRag.title"),
    placeholder: getLocalizedString(
      "core.createProjectQuestion.capability.customCopilotRag.placeholder"
    ),
    staticOptions: CustomCopilotRagOptions.all(),
    dynamicOptions: () => CustomCopilotRagOptions.all(),
    default: CustomCopilotRagOptions.customize().id,
  };
}

function customCopilotAssistantQuestion(): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: QuestionNames.CustomCopilotAssistant,
    title: getLocalizedString("core.createProjectQuestion.capability.customCopilotAssistant.title"),
    placeholder: getLocalizedString(
      "core.createProjectQuestion.capability.customCopilotAssistant.placeholder"
    ),
    staticOptions: CustomCopilotAssistantOptions.all(),
    dynamicOptions: () => CustomCopilotAssistantOptions.all(),
    default: CustomCopilotAssistantOptions.new().id,
  };
}

function llmServiceQuestion(): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: QuestionNames.LLMService,
    title: getLocalizedString("core.createProjectQuestion.llmService.title"),
    placeholder: getLocalizedString("core.createProjectQuestion.llmService.placeholder"),
    staticOptions: [
      {
        id: "llm-service-azure-openai",
        cliName: "azure-openai",
        label: getLocalizedString("core.createProjectQuestion.llmServiceAzureOpenAIOption.label"),
        detail: getLocalizedString("core.createProjectQuestion.llmServiceAzureOpenAIOption.detail"),
      },
      {
        id: "llm-service-openai",
        label: getLocalizedString("core.createProjectQuestion.llmServiceOpenAIOption.label"),
        detail: getLocalizedString("core.createProjectQuestion.llmServiceOpenAIOption.detail"),
      },
    ],
    dynamicOptions: (inputs: Inputs) => {
      const options: OptionItem[] = [];
      if (inputs[QuestionNames.CustomCopilotAssistant] !== "custom-copilot-agent-assistants-api") {
        options.push({
          id: "llm-service-azure-openai",
          label: getLocalizedString("core.createProjectQuestion.llmServiceAzureOpenAIOption.label"),
          detail: getLocalizedString(
            "core.createProjectQuestion.llmServiceAzureOpenAIOption.detail"
          ),
        });
      }
      options.push({
        id: "llm-service-openai",
        label: getLocalizedString("core.createProjectQuestion.llmServiceOpenAIOption.label"),
        detail: getLocalizedString("core.createProjectQuestion.llmServiceOpenAIOption.detail"),
      });
      return options;
    },
    skipSingleOption: true,
    default: "llm-service-azure-openai",
  };
}

function openAIKeyQuestion(): TextInputQuestion {
  return {
    type: "text",
    password: true,
    name: QuestionNames.OpenAIKey,
    title: getLocalizedString("core.createProjectQuestion.llmService.openAIKey.title"),
    placeholder: getLocalizedString("core.createProjectQuestion.llmService.openAIKey.placeholder"),
  };
}

function azureOpenAIKeyQuestion(): TextInputQuestion {
  return {
    type: "text",
    password: true,
    name: QuestionNames.AzureOpenAIKey,
    title: getLocalizedString("core.createProjectQuestion.llmService.azureOpenAIKey.title"),
    placeholder: getLocalizedString(
      "core.createProjectQuestion.llmService.azureOpenAIKey.placeholder"
    ),
  };
}

function azureOpenAIEndpointQuestion(): TextInputQuestion {
  return {
    type: "text",
    name: QuestionNames.AzureOpenAIEndpoint,
    title: getLocalizedString("core.createProjectQuestion.llmService.azureOpenAIEndpoint.title"),
    placeholder: getLocalizedString(
      "core.createProjectQuestion.llmService.azureOpenAIEndpoint.placeholder"
    ),
  };
}

function azureOpenAIDeploymentNameQuestion(): TextInputQuestion {
  return {
    type: "text",
    name: QuestionNames.AzureOpenAIDeploymentName,
    title: getLocalizedString(
      "core.createProjectQuestion.llmService.azureOpenAIDeploymentName.title"
    ),
    placeholder: getLocalizedString(
      "core.createProjectQuestion.llmService.azureOpenAIDeploymentName.placeholder"
    ),
  };
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
        // office addin import sub-tree (capabilities=office-addin-import | outlook-addin-import)
        condition: {
          enum: [
            CapabilityOptions.outlookAddinImport().id,
            CapabilityOptions.officeAddinImport().id,
          ],
        },
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
        // Search ME sub-tree
        condition: { equals: CapabilityOptions.m365SearchMe().id },
        data: meArchitectureQuestion(),
      },
      {
        condition: (inputs: Inputs) => {
          return (
            inputs[QuestionNames.MeArchitectureType] == MeArchitectureOptions.newApi().id ||
            (featureFlagManager.getBooleanValue(FeatureFlags.CopilotAuth) &&
              isCopilotPluginEnabled() &&
              inputs[QuestionNames.Capabilities] == CapabilityOptions.copilotPluginNewApi().id)
          );
        },
        data: apiAuthQuestion(),
      },
      {
        condition: (inputs: Inputs) => {
          return inputs[QuestionNames.Capabilities] == CapabilityOptions.customCopilotRag().id;
        },
        data: customCopilotRagQuestion(),
      },
      {
        // from API spec
        condition: (inputs: Inputs) => {
          return (
            inputs[QuestionNames.Capabilities] === CapabilityOptions.copilotPluginApiSpec().id ||
            inputs[QuestionNames.MeArchitectureType] === MeArchitectureOptions.apiSpec().id ||
            inputs[QuestionNames.CustomCopilotRag] === CustomCopilotRagOptions.customApi().id
          );
        },
        data: { type: "group", name: QuestionNames.FromExistingApi },
        children: [
          {
            data: apiSpecLocationQuestion(),
          },
          {
            data: apiOperationQuestion(),
          },
        ],
      },
      {
        condition: (inputs: Inputs) => {
          return (
            inputs[QuestionNames.Capabilities] == CapabilityOptions.customCopilotAssistant().id
          );
        },
        data: customCopilotAssistantQuestion(),
      },
      {
        // programming language
        data: programmingLanguageQuestion(),
        condition: (inputs: Inputs) => {
          return (
            !!inputs[QuestionNames.Capabilities] &&
            inputs[QuestionNames.Capabilities] !== CapabilityOptions.copilotPluginApiSpec().id &&
            inputs[QuestionNames.Capabilities] !== CapabilityOptions.customizeGptBasic().id &&
            inputs[QuestionNames.MeArchitectureType] !== MeArchitectureOptions.apiSpec().id &&
            inputs[QuestionNames.Capabilities] !== CapabilityOptions.officeAddinImport().id &&
            inputs[QuestionNames.Capabilities] !== CapabilityOptions.outlookAddinImport().id
          );
        },
      },
      {
        condition: (inputs: Inputs) => {
          return (
            inputs[QuestionNames.Capabilities] === CapabilityOptions.customCopilotBasic().id ||
            inputs[QuestionNames.Capabilities] === CapabilityOptions.customCopilotRag().id ||
            inputs[QuestionNames.Capabilities] === CapabilityOptions.customCopilotAssistant().id
          );
        },
        data: llmServiceQuestion(),
        children: [
          {
            condition: { equals: "llm-service-azure-openai" },
            data: azureOpenAIKeyQuestion(),
            children: [
              {
                condition: (inputs: Inputs) => {
                  return inputs[QuestionNames.AzureOpenAIKey]?.length > 0;
                },
                data: azureOpenAIEndpointQuestion(),
                children: [
                  {
                    condition: (inputs: Inputs) => {
                      return inputs[QuestionNames.AzureOpenAIEndpoint]?.length > 0;
                    },
                    data: azureOpenAIDeploymentNameQuestion(),
                  },
                ],
              },
            ],
          },
          {
            condition: { equals: "llm-service-openai" },
            data: openAIKeyQuestion(),
          },
        ],
      },
      {
        // Office addin framework for json manifest
        data: officeAddinFrameworkQuestion(),
        condition: (inputs: Inputs) => {
          return (
            inputs[QuestionNames.ProjectType] === ProjectTypeOptions.officeAddin().id &&
            inputs[QuestionNames.Capabilities] !== CapabilityOptions.officeAddinImport().id
          );
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
    condition: (inputs: Inputs) => {
      return inputs[QuestionNames.ProjectType] !== ProjectTypeOptions.startWithGithubCopilot().id;
    },
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
      {
        condition: (inputs: Inputs) =>
          inputs[QuestionNames.ProjectType] === ProjectTypeOptions.officeXMLAddin().id,
        data: officeAddinHostingQuestion(),
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
