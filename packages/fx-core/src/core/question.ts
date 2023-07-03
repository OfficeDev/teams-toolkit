// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as fs from "fs-extra";
import * as jsonschema from "jsonschema";
import * as os from "os";
import * as path from "path";

/**
 * @author Huajie Zhang <zhjay23@qq.com>
 */
import {
  AppPackageFolderName,
  BuildFolderName,
  DynamicPlatforms,
  FolderQuestion,
  FxError,
  Inputs,
  LocalEnvironmentName,
  MultiSelectQuestion,
  ok,
  OptionItem,
  Platform,
  QTreeNode,
  Result,
  SingleFileQuestion,
  SingleSelectQuestion,
  StaticOptions,
  TextInputQuestion,
} from "@microsoft/teamsfx-api";

import { ConstantString } from "../common/constants";
import { getLocalizedString } from "../common/localizeUtils";
import { Hub } from "../common/m365/constants";
import { sampleProvider } from "../common/samples";
import {
  BotOptionItem,
  CommandAndResponseOptionItem,
  DashboardOptionItem,
  LinkUnfurlingItem,
  M365SearchAppOptionItem,
  M365SsoLaunchPageOptionItem,
  MessageExtensionItem,
  MessageExtensionNewUIItem,
  NewProjectTypeBotOptionItem,
  NewProjectTypeMessageExtensionOptionItem,
  NewProjectTypeOutlookAddinOptionItem,
  NewProjectTypeTabOptionItem,
  NotificationOptionItem,
  TabNonSsoItem,
  TabOptionItem,
  TabSPFxItem,
  WorkflowOptionItem,
} from "../component/constants";
import {
  answerToRepaceBotId,
  answerToReplaceMessageExtensionBotId,
  isFromDevPortal,
} from "../component/developerPortalScaffoldUtils";
import {
  ImportAddinProjectItem,
  OfficeAddinItems,
} from "../component/generator/officeAddin/question";
import { StaticTab } from "../component/driver/teamsApp/interfaces/appdefinitions/staticTab";
import { environmentManager } from "./environment";

export enum CoreQuestionNames {
  AppName = "app-name",
  Folder = "folder",
  ProjectPath = "projectPath",
  ProgrammingLanguage = "programming-language",
  ProjectType = "project-type",
  Capabilities = "capabilities",
  Features = "features",
  CreateFromScratch = "scratch",
  Runtime = "runtime",
  Samples = "samples",
  SourceEnvName = "sourceEnvName",
  TargetEnvName = "targetEnvName",
  TargetResourceGroupName = "targetResourceGroupName",
  NewResourceGroupName = "newResourceGroupName",
  NewResourceGroupLocation = "newResourceGroupLocation",
  NewTargetEnvName = "newTargetEnvName",
  ExistingTabEndpoint = "existing-tab-endpoint",
  SafeProjectName = "safeProjectName",
  ReplaceContentUrl = "replaceContentUrl",
  ReplaceWebsiteUrl = "replaceWebsiteUrl",
  AppPackagePath = "appPackagePath",
  ReplaceBotIds = "replaceBotIds",
  TeamsAppManifestFilePath = "manifest-path",
  LocalTeamsAppManifestFilePath = "local-manifest-path",
  AadAppManifestFilePath = "manifest-file-path",
  TeamsAppPackageFilePath = "app-package-file-path",
  ValidateMethod = "validate-method",
  ConfirmManifest = "confirmManifest",
  ConfirmLocalManifest = "confirmLocalManifest",
  OutputZipPathParamName = "output-zip-path",
  OutputManifestParamName = "output-manifest-path",
  M365Host = "m365-host",
  BotHostTypeTrigger = "bot-host-type-trigger",
}

export const ProjectNamePattern =
  '^(?=(.*[\\da-zA-Z]){2})[a-zA-Z][^"<>:\\?/*&|\u0000-\u001F]*[^"\\s.<>:\\?/*&|\u0000-\u001F]$';

export function createAppNameQuestion(
  defaultAppName?: string,
  validateProjectPathExistence = true
): TextInputQuestion {
  const question: TextInputQuestion = {
    type: "text",
    name: CoreQuestionNames.AppName,
    title: "Application name",
    default: defaultAppName,
    validation: {
      validFunc: async (input: string, previousInputs?: Inputs): Promise<string | undefined> => {
        const schema = {
          pattern: ProjectNamePattern,
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
        if (validateProjectPathExistence && previousInputs && previousInputs.folder) {
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

export function QuestionRootFolder(): FolderQuestion {
  return {
    type: "folder",
    name: CoreQuestionNames.Folder,
    title: getLocalizedString("core.question.workspaceFolder.title"),
    placeholder: getLocalizedString("core.question.workspaceFolder.placeholder"),
    default: path.join(os.homedir(), ConstantString.RootFolder),
  };
}

export const ProgrammingLanguageQuestionForDotNet: SingleSelectQuestion = {
  name: CoreQuestionNames.ProgrammingLanguage,
  title: "Programming Language",
  type: "singleSelect",
  staticOptions: [{ id: "csharp", label: "C#" }],
  skipSingleOption: true,
};

export const ProgrammingLanguageQuestion: SingleSelectQuestion = {
  name: CoreQuestionNames.ProgrammingLanguage,
  title: "Programming Language",
  type: "singleSelect",
  staticOptions: [
    { id: "javascript", label: "JavaScript" },
    { id: "typescript", label: "TypeScript" },
  ],
  dynamicOptions: (inputs: Inputs): StaticOptions => {
    if (inputs.platform === Platform.VS) {
      return [{ id: "csharp", label: "C#" }];
    }
    const capabilities = inputs[CoreQuestionNames.Capabilities] as string[];
    if (capabilities && capabilities.includes && capabilities.includes(TabSPFxItem().id))
      return [{ id: "typescript", label: "TypeScript" }];
    return [
      { id: "javascript", label: "JavaScript" },
      { id: "typescript", label: "TypeScript" },
    ];
  },
  skipSingleOption: true,
  default: (inputs: Inputs) => {
    const capability = inputs[CoreQuestionNames.Capabilities] as string;
    if (capability && capability === TabSPFxItem().id) {
      return "typescript";
    }
    const feature = inputs[CoreQuestionNames.Features] as string;
    if (feature && feature === TabSPFxItem().id) {
      return "typescript";
    }
    return "javascript";
  },
  placeholder: (inputs: Inputs): string => {
    const capability = inputs[CoreQuestionNames.Capabilities] as string;
    if (capability && capability === TabSPFxItem().id) {
      return getLocalizedString("core.ProgrammingLanguageQuestion.placeholder.spfx");
    }
    const feature = inputs[CoreQuestionNames.Features] as string;
    if (feature && feature === TabSPFxItem().id) {
      return getLocalizedString("core.ProgrammingLanguageQuestion.placeholder.spfx");
    }
    return getLocalizedString("core.ProgrammingLanguageQuestion.placeholder");
  },
};

export function createCapabilityForDotNet(): SingleSelectQuestion {
  const staticOptions: StaticOptions = [
    NotificationOptionItem(),
    CommandAndResponseOptionItem(),
    TabOptionItem(),
    MessageExtensionItem(),
  ];
  return {
    name: CoreQuestionNames.Capabilities,
    title: getLocalizedString("core.createCapabilityQuestion.title"),
    type: "singleSelect",
    staticOptions: staticOptions,
    placeholder: getLocalizedString("core.createCapabilityQuestion.placeholder"),
  };
}

export function createCapabilityQuestionPreview(inputs?: Inputs): SingleSelectQuestion {
  // AB test for notification/command/workflow bot, dashboard tab template naming
  const notificationOptionItem = NotificationOptionItem();
  const commandAndResponseOptionItem = CommandAndResponseOptionItem();
  const workflowOptionItem = WorkflowOptionItem();
  const dashboardOptionItem = DashboardOptionItem();

  // AB test for in product doc
  if (inputs?.inProductDoc) {
    workflowOptionItem.data = "cardActionResponse";
    workflowOptionItem.buttons = [
      {
        iconPath: "file-code",
        tooltip: getLocalizedString("core.option.inProduct"),
        command: "fx-extension.openTutorial",
      },
    ];
  }

  // new capabilities question order
  const newBots = [notificationOptionItem, commandAndResponseOptionItem, workflowOptionItem];

  const newTabs = [dashboardOptionItem];

  const staticOptions: StaticOptions = [
    ...newBots,
    ...newTabs,
    TabSPFxItem(),
    TabNonSsoItem(),
    BotOptionItem(),
    MessageExtensionNewUIItem(),
    M365SsoLaunchPageOptionItem(),
    M365SearchAppOptionItem(),
  ];

  return {
    name: CoreQuestionNames.Capabilities,
    title: getLocalizedString("core.createCapabilityQuestion.titleNew"),
    type: "singleSelect",
    staticOptions: staticOptions,
    placeholder: getLocalizedString("core.createCapabilityQuestion.placeholder"),
    forgetLastValue: true,
  };
}

export function createNewProjectQuestionWith2Layers(inputs?: Inputs): SingleSelectQuestion {
  const staticOptions: StaticOptions = [
    NewProjectTypeBotOptionItem(),
    NewProjectTypeTabOptionItem(),
    NewProjectTypeMessageExtensionOptionItem(),
  ];

  if (!isFromDevPortal(inputs)) {
    staticOptions.push(NewProjectTypeOutlookAddinOptionItem());
  }

  return {
    name: CoreQuestionNames.ProjectType,
    title: getLocalizedString("core.createProjectQuestion.title"),
    type: "singleSelect",
    staticOptions: staticOptions,
    placeholder: getLocalizedString("core.getCreateNewOrFromSampleQuestion.placeholder"),
    forgetLastValue: true,
  };
}

export function getBotProjectQuestionNode(inputs?: Inputs): SingleSelectQuestion {
  const staticOptions: StaticOptions = [
    BotOptionItem(),
    NotificationOptionItem(),
    CommandAndResponseOptionItem(),
    WorkflowOptionItem(),
  ];

  // AB test for in product doc
  if (inputs?.inProductDoc) {
    staticOptions[3].data = "cardActionResponse";
    staticOptions[3].buttons = [
      {
        iconPath: "file-code",
        tooltip: getLocalizedString("core.option.inProduct"),
        command: "fx-extension.openTutorial",
      },
    ];
  }

  return {
    name: CoreQuestionNames.Capabilities,
    title: getLocalizedString("core.createProjectQuestion.projectType.bot.title"),
    type: "singleSelect",
    staticOptions: staticOptions,
    placeholder: getLocalizedString("core.getCreateNewOrFromSampleQuestion.placeholder"),
    forgetLastValue: true,
  };
}

export function getTabTypeProjectQuestionNode(): SingleSelectQuestion {
  const staticOptions: StaticOptions = [
    TabNonSsoItem(),
    M365SsoLaunchPageOptionItem(),
    DashboardOptionItem(),
    TabSPFxItem(),
  ];

  return {
    name: CoreQuestionNames.Capabilities,
    title: getLocalizedString("core.createProjectQuestion.projectType.tab.title"),
    type: "singleSelect",
    staticOptions: staticOptions,
    placeholder: getLocalizedString("core.getCreateNewOrFromSampleQuestion.placeholder"),
    forgetLastValue: true,
  };
}

export function getMessageExtensionTypeProjectQuestionNode(): SingleSelectQuestion {
  const staticOptions: StaticOptions = [
    LinkUnfurlingItem(),
    M365SearchAppOptionItem(),
    MessageExtensionNewUIItem(),
  ];

  return {
    name: CoreQuestionNames.Capabilities,
    title: getLocalizedString("core.createProjectQuestion.projectType.messageExtension.title"),
    type: "singleSelect",
    staticOptions: staticOptions,
    placeholder: getLocalizedString("core.getCreateNewOrFromSampleQuestion.placeholder"),
    forgetLastValue: true,
  };
}

export function getOutlookAddinTypeProjectQuestionNode(): SingleSelectQuestion {
  const staticOptions: StaticOptions = [...OfficeAddinItems(), ImportAddinProjectItem()];

  return {
    name: CoreQuestionNames.Capabilities,
    title: getLocalizedString("core.createProjectQuestion.projectType.outlookAddin.title"),
    type: "singleSelect",
    staticOptions: staticOptions,
    placeholder: getLocalizedString("core.getCreateNewOrFromSampleQuestion.placeholder"),
    forgetLastValue: true,
  };
}

function QuestionSelectTargetEnvironment(): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: CoreQuestionNames.TargetEnvName,
    title: getLocalizedString("core.QuestionSelectTargetEnvironment.title"),
    staticOptions: [],
    skipSingleOption: true,
    forgetLastValue: true,
  };
}

export function getQuestionNewTargetEnvironmentName(projectPath: string): TextInputQuestion {
  return {
    type: "text",
    name: CoreQuestionNames.NewTargetEnvName,
    title: getLocalizedString("core.getQuestionNewTargetEnvironmentName.title"),
    validation: {
      validFunc: async (input: string): Promise<string | undefined> => {
        const targetEnvName = input;
        const match = targetEnvName.match(environmentManager.envNameRegex);
        if (!match) {
          return getLocalizedString("core.getQuestionNewTargetEnvironmentName.validation1");
        }

        if (targetEnvName === LocalEnvironmentName) {
          return getLocalizedString(
            "core.getQuestionNewTargetEnvironmentName.validation3",
            LocalEnvironmentName
          );
        }

        const envConfigs = await environmentManager.listRemoteEnvConfigs(projectPath, true);
        if (envConfigs.isErr()) {
          return getLocalizedString("core.getQuestionNewTargetEnvironmentName.validation4");
        }

        const found =
          envConfigs.value.find(
            (env) => env.localeCompare(targetEnvName, undefined, { sensitivity: "base" }) === 0
          ) !== undefined;
        if (found) {
          return getLocalizedString(
            "core.getQuestionNewTargetEnvironmentName.validation5",
            targetEnvName
          );
        } else {
          return undefined;
        }
      },
    },
    placeholder: getLocalizedString("core.getQuestionNewTargetEnvironmentName.placeholder"),
  };
}

export function QuestionSelectSourceEnvironment(): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: CoreQuestionNames.SourceEnvName,
    title: getLocalizedString("core.QuestionSelectSourceEnvironment.title"),
    staticOptions: [],
    skipSingleOption: true,
    forgetLastValue: true,
  };
}
export function QuestionSelectResourceGroup(): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: CoreQuestionNames.TargetResourceGroupName,
    title: getLocalizedString("core.QuestionSelectResourceGroup.title"),
    staticOptions: [],
    skipSingleOption: true,
    forgetLastValue: true,
  };
}
export function newResourceGroupNameQuestion(
  existingResourceGroupNames: string[]
): TextInputQuestion {
  const question = QuestionNewResourceGroupName();
  question.validation = {
    validFunc: (input: string): string | undefined => {
      const name = input as string;
      // https://docs.microsoft.com/en-us/rest/api/resources/resource-groups/create-or-update#uri-parameters
      const match = name.match(/^[-\w._()]+$/);
      if (!match) {
        return getLocalizedString("core.QuestionNewResourceGroupName.validation");
      }

      // To avoid the issue in CLI that using async func for validation and filter will make users input answers twice,
      // we check the existence of a resource group from the list rather than call the api directly for now.
      // Bug: https://msazure.visualstudio.com/Microsoft%20Teams%20Extensibility/_workitems/edit/15066282
      // GitHub issue: https://github.com/SBoudrias/Inquirer.js/issues/1136
      const maybeExist =
        existingResourceGroupNames.findIndex((o) => o.toLowerCase() === input.toLowerCase()) >= 0;
      if (maybeExist) {
        return `resource group already exists: ${name}`;
      }
      // const maybeExist = await resourceGroupHelper.checkResourceGroupExistence(name, rmClient);
      // if (maybeExist.isErr()) {
      //   return maybeExist.error.message;
      // }
      // if (maybeExist.value) {
      //   return `resource group already exists: ${name}`;
      // }
      return undefined;
    },
  };
  return question;
}
function QuestionNewResourceGroupName(): TextInputQuestion {
  return {
    type: "text",
    name: CoreQuestionNames.NewResourceGroupName,
    title: getLocalizedString("core.QuestionNewResourceGroupName.title"),
    placeholder: getLocalizedString("core.QuestionNewResourceGroupName.placeholder"),
    // default resource group name will change with env name
    forgetLastValue: true,
  };
}

export function QuestionNewResourceGroupLocation(): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: CoreQuestionNames.NewResourceGroupLocation,
    title: getLocalizedString("core.QuestionNewResourceGroupLocation.title"),
    staticOptions: [],
  };
}

export function ScratchOptionYesVSC(): OptionItem {
  const label = getLocalizedString("core.ScratchOptionYesVSC.officeAddin.label");
  return {
    id: "yes",
    label: `$(new-folder) ${label}`,
    detail: getLocalizedString("core.ScratchOptionYesVSC.detail"),
  };
}

export function ScratchOptionNoVSC(): OptionItem {
  return {
    id: "no",
    label: `$(heart) ${getLocalizedString("core.ScratchOptionNoVSC.label")}`,
    detail: getLocalizedString("core.ScratchOptionNoVSC.detail"),
  };
}

export function RuntimeOptionNodeJs(): OptionItem {
  return {
    id: "node",
    label: "Node.js",
    detail: getLocalizedString("core.RuntimeOptionNodeJS.detail"),
  };
}

export function RuntimeOptionDotNet(): OptionItem {
  return {
    id: "dotnet",
    label: ".NET Core",
    detail: getLocalizedString("core.RuntimeOptionDotNet.detail"),
  };
}
export function ScratchOptionYes(): OptionItem {
  return {
    id: "yes",
    label: getLocalizedString("core.ScratchOptionYes.label"),
    detail: getLocalizedString("core.ScratchOptionYes.detail"),
  };
}

export function ScratchOptionNo(): OptionItem {
  return {
    id: "no",
    label: getLocalizedString("core.ScratchOptionNo.label"),
    detail: getLocalizedString("core.ScratchOptionNo.detail"),
  };
}

// This question should only exist on CLI
export function getRuntimeQuestion(): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: CoreQuestionNames.Runtime,
    title: getLocalizedString("core.getRuntimeQuestion.title"),
    staticOptions: [RuntimeOptionNodeJs(), RuntimeOptionDotNet()],
    default: RuntimeOptionNodeJs().id,
    placeholder: getLocalizedString("core.getRuntimeQuestion.placeholder"),
  };
}

export function getCreateNewOrFromSampleQuestion(platform: Platform): SingleSelectQuestion {
  const staticOptions: OptionItem[] = [];
  if (platform === Platform.VSCode) {
    staticOptions.push(ScratchOptionYesVSC());
    staticOptions.push(CreateNewOfficeAddinOption());
    staticOptions.push(ScratchOptionNoVSC());
  } else {
    staticOptions.push(ScratchOptionYes());
    staticOptions.push(ScratchOptionNo());
  }
  return {
    type: "singleSelect",
    name: CoreQuestionNames.CreateFromScratch,
    title: getLocalizedString("core.getCreateNewOrFromSampleQuestion.title"),
    staticOptions,
    default: ScratchOptionYes().id,
    placeholder: getLocalizedString("core.getCreateNewOrFromSampleQuestion.placeholder"),
    skipSingleOption: true,
    forgetLastValue: true,
  };
}

export function SampleSelect(): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: CoreQuestionNames.Samples,
    title: getLocalizedString("core.SampleSelect.title"),
    staticOptions: sampleProvider.SampleCollection.samples.map((sample) => {
      return {
        id: sample.id,
        label: sample.title,
        description: `${sample.time} • ${sample.configuration}`,
        detail: sample.shortDescription,
        data: sample.link,
      } as OptionItem;
    }),
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

const defaultTabLocalHostUrl = "https://localhost:53000/index.html#/tab";

export const tabsContentUrlQuestion = (tabs: StaticTab[]): MultiSelectQuestion => {
  return {
    type: "multiSelect",
    name: CoreQuestionNames.ReplaceContentUrl,
    title: getLocalizedString("core.updateContentUrlQuestion.title"),
    staticOptions: tabs.map((o) => tabContentUrlOptionItem(o)),
    default: tabs.map((o) => o.name),
    placeholder: getLocalizedString("core.updateUrlQuestion.placeholder"),
    forgetLastValue: true,
  };
};

export const tabsWebsitetUrlQuestion = (tabs: StaticTab[]): MultiSelectQuestion => {
  return {
    type: "multiSelect",
    name: CoreQuestionNames.ReplaceWebsiteUrl,
    title: getLocalizedString("core.updateWebsiteUrlQuestion.title"),
    staticOptions: tabs.map((o) => tabWebsiteUrlOptionItem(o)),
    default: tabs.map((o) => o.name),
    placeholder: getLocalizedString("core.updateUrlQuestion.placeholder"),
    forgetLastValue: true,
  };
};

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

export const BotIdsQuestion = (
  botId: string | undefined,
  messageExtensionBotId: string | undefined
): MultiSelectQuestion => {
  const defaultIds = [];
  const options: OptionItem[] = [];
  if (botId) {
    defaultIds.push(answerToRepaceBotId);
    options.push(botOptionItem(false, botId));
  }
  if (messageExtensionBotId) {
    defaultIds.push(answerToReplaceMessageExtensionBotId);
    options.push(botOptionItem(true, messageExtensionBotId));
  }
  return {
    type: "multiSelect",
    name: CoreQuestionNames.ReplaceBotIds,
    title: getLocalizedString("core.updateBotIdsQuestion.title"),
    staticOptions: options,
    default: defaultIds,
    placeholder: getLocalizedString("core.updateBotIdsQuestion.placeholder"),
    forgetLastValue: true,
  };
};

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

export function CreateNewOfficeAddinOption(): OptionItem {
  return {
    id: "newAddin",
    label: `$(new-folder) ${getLocalizedString("core.NewOfficeAddinOptionVSC.label")}`,
    detail: getLocalizedString("core.NewOfficeAddinOptionVSC.detail"),
  };
}

export function createCapabilityForOfficeAddin(): SingleSelectQuestion {
  return {
    name: CoreQuestionNames.Capabilities,
    title: getLocalizedString("core.createCapabilityQuestion.title"),
    type: "singleSelect",
    staticOptions: [...OfficeAddinItems(), ImportAddinProjectItem()],
    placeholder: getLocalizedString("core.createCapabilityQuestion.placeholder"),
    skipSingleOption: true,
  };
}

export function selectAadAppManifestQuestion(inputs: Inputs): QTreeNode {
  const manifestPath: string = path.join(inputs.projectPath!, "aad.manifest.json");

  const aadAppManifestNode: SingleFileQuestion = {
    name: CoreQuestionNames.AadAppManifestFilePath,
    title: getLocalizedString("core.selectAadAppManifestQuestion.title"),
    type: "singleFile",
    default: (inputs: Inputs): string | undefined => {
      if (fs.pathExistsSync(manifestPath)) {
        return manifestPath;
      } else {
        return undefined;
      }
    },
  };

  const res = new QTreeNode(aadAppManifestNode);
  const confirmNode = confirmManifestNode(manifestPath, false);
  res.addChild(confirmNode);
  return res;
}

export function selectTeamsAppManifestQuestion(inputs: Inputs, isLocal = false): QTreeNode {
  const teamsAppManifestNode: SingleFileQuestion = {
    name: isLocal
      ? CoreQuestionNames.LocalTeamsAppManifestFilePath
      : CoreQuestionNames.TeamsAppManifestFilePath,
    title: getLocalizedString(
      isLocal
        ? "core.selectLocalTeamsAppManifestQuestion.title"
        : "core.selectTeamsAppManifestQuestion.title"
    ),
    type: "singleFile",
    default: (inputs: Inputs): string | undefined => {
      const manifestPath = path.join(
        inputs.projectPath!,
        AppPackageFolderName,
        isLocal ? "manifest.local.json" : "manifest.json"
      );
      if (fs.pathExistsSync(manifestPath)) {
        return manifestPath;
      } else {
        return undefined;
      }
    },
  };

  const res = new QTreeNode(teamsAppManifestNode);
  if (
    inputs.platform !== Platform.CLI_HELP &&
    inputs.platform !== Platform.CLI &&
    inputs.platform !== Platform.VS
  ) {
    const manifestPath = path.join(
      inputs.projectPath!,
      AppPackageFolderName,
      isLocal ? "manifest.local.json" : "manifest.json"
    );
    const confirmNode = confirmManifestNode(manifestPath, true, isLocal);
    res.addChild(confirmNode);
  }
  return res;
}

export function selectTeamsAppPackageQuestion(): SingleFileQuestion {
  return {
    name: CoreQuestionNames.TeamsAppPackageFilePath,
    title: getLocalizedString("core.selectTeamsAppPackageQuestion.title"),
    type: "singleFile",
    default: (inputs: Inputs): string | undefined => {
      const appPackagePath: string = path.join(
        inputs.projectPath!,
        AppPackageFolderName,
        BuildFolderName,
        "appPackage.dev.zip"
      );
      if (fs.pathExistsSync(appPackagePath)) {
        return appPackagePath;
      } else {
        return undefined;
      }
    },
  };
}

export async function selectEnvNode(
  inputs: Inputs,
  isRemote = true
): Promise<QTreeNode | undefined> {
  const envProfilesResult = isRemote
    ? await environmentManager.listRemoteEnvConfigs(inputs.projectPath!, true)
    : await environmentManager.listAllEnvConfigs(inputs.projectPath!);
  if (envProfilesResult.isErr()) {
    // If failed to load env, return undefined
    return undefined;
  }

  const envList = envProfilesResult.value;
  const selectEnv = QuestionSelectTargetEnvironment();
  selectEnv.staticOptions = envList;

  const envNode = new QTreeNode(selectEnv);
  return envNode;
}

function confirmManifestNode(
  defaultManifestFilePath: string,
  isTeamsApp = true,
  isLocal = false
): QTreeNode {
  const confirmManifestQuestion: SingleSelectQuestion = {
    name: isLocal ? CoreQuestionNames.ConfirmLocalManifest : CoreQuestionNames.ConfirmManifest,
    title: isTeamsApp
      ? getLocalizedString(
          isLocal
            ? "core.selectLocalTeamsAppManifestQuestion.title"
            : "core.selectTeamsAppManifestQuestion.title"
        )
      : getLocalizedString("core.selectAadAppManifestQuestion.title"),
    type: "singleSelect",
    staticOptions: [],
    skipSingleOption: false,
    placeholder: getLocalizedString("core.confirmManifestQuestion.placeholder"),
  };

  confirmManifestQuestion.dynamicOptions = (inputs: Inputs): StaticOptions => {
    return [
      {
        id: "manifest",
        label: `$(file) ${path.basename(
          isTeamsApp
            ? inputs[
                isLocal
                  ? CoreQuestionNames.LocalTeamsAppManifestFilePath
                  : CoreQuestionNames.TeamsAppManifestFilePath
              ]
            : inputs[CoreQuestionNames.AadAppManifestFilePath]
        )}`,
        description: path.dirname(
          isTeamsApp
            ? inputs[
                isLocal
                  ? CoreQuestionNames.LocalTeamsAppManifestFilePath
                  : CoreQuestionNames.TeamsAppManifestFilePath
              ]
            : inputs[CoreQuestionNames.AadAppManifestFilePath]
        ),
      },
    ];
  };
  const confirmManifestNode = new QTreeNode(confirmManifestQuestion);
  confirmManifestNode.condition = {
    notEquals: defaultManifestFilePath,
  };
  return confirmManifestNode;
}

export async function getQuestionForDeployAadManifest(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const isDynamicQuestion = DynamicPlatforms.includes(inputs.platform);
  if (isDynamicQuestion) {
    const root = await getUpdateAadManifestQuestion(inputs);
    return ok(root);
  }
  return ok(undefined);
}

async function getUpdateAadManifestQuestion(inputs: Inputs): Promise<QTreeNode> {
  // Teams app manifest select node
  const aadAppSelectNode = selectAadAppManifestQuestion(inputs);

  // Env select node
  const envNode = await selectEnvNode(inputs, false);
  if (!envNode) {
    return aadAppSelectNode;
  }
  envNode.data.name = "env";
  aadAppSelectNode.addChild(envNode);
  envNode.condition = {
    validFunc: validateAadManifestContainsPlaceholder,
  };
  return aadAppSelectNode;
}

export async function validateAadManifestContainsPlaceholder(
  input: any,
  inputs?: Inputs
): Promise<string | undefined> {
  const aadManifestPath = inputs?.[CoreQuestionNames.AadAppManifestFilePath];
  const placeholderRegex = /\$\{\{ *[a-zA-Z0-9_.-]* *\}\}/g;
  const regexObj = new RegExp(placeholderRegex);
  try {
    if (!aadManifestPath || !(await fs.pathExists(aadManifestPath))) {
      return "Skip Current Question";
    }
    const manifest = await fs.readFile(aadManifestPath, ConstantString.UTF8Encoding);
    if (regexObj.test(manifest)) {
      return undefined;
    }
  } catch (e) {
    return "Skip Current Question";
  }
  return "Skip Current Question";
}

export function selectM365HostQuestion(): QTreeNode {
  return new QTreeNode({
    name: CoreQuestionNames.M365Host,
    title: getLocalizedString("core.M365HostQuestion.title"),
    type: "singleSelect",
    staticOptions: [Hub.teams, Hub.outlook, Hub.office],
    placeholder: getLocalizedString("core.M365HostQuestion.placeholder"),
  });
}
