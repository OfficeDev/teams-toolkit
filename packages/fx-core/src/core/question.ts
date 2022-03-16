// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  FolderQuestion,
  OptionItem,
  Platform,
  SingleSelectQuestion,
  TextInputQuestion,
  FuncQuestion,
  Inputs,
  LocalEnvironmentName,
  StaticOptions,
  MultiSelectQuestion,
} from "@microsoft/teamsfx-api";
import * as jsonschema from "jsonschema";
import * as path from "path";
import * as fs from "fs-extra";
import * as os from "os";
import { environmentManager } from "./environment";
import { sampleProvider } from "../common/samples";
import { getRootDirectory, isBotNotificationEnabled } from "../common/tools";
import { getLocalizedString } from "../common/localizeUtils";
import {
  BotOptionItem,
  MessageExtensionItem,
  NotificationOptionItem,
  TabOptionItem,
  TabSPFxItem,
} from "../plugins/solution/fx-solution/question";
import { isValidProject } from "../common";

export enum CoreQuestionNames {
  AppName = "app-name",
  DefaultAppNameFunc = "default-app-name-func",
  Folder = "folder",
  ProjectPath = "projectPath",
  ProgrammingLanguage = "programming-language",
  Capabilities = "capabilities",
  Solution = "solution",
  CreateFromScratch = "scratch",
  Samples = "samples",
  Stage = "stage",
  SubStage = "substage",
  SourceEnvName = "sourceEnvName",
  TargetEnvName = "targetEnvName",
  TargetResourceGroupName = "targetResourceGroupName",
  NewResourceGroupName = "newResourceGroupName",
  NewResourceGroupLocation = "newResourceGroupLocation",
  NewTargetEnvName = "newTargetEnvName",
}

export const ProjectNamePattern = "^[a-zA-Z][\\da-zA-Z]+$";

export function createAppNameQuestion(validateProjectPathExistence = true): TextInputQuestion {
  const question: TextInputQuestion = {
    type: "text",
    name: CoreQuestionNames.AppName,
    title: "Application name",
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
        }
        if (validateProjectPathExistence && previousInputs && previousInputs.folder) {
          let folder = previousInputs.folder as string;
          if (previousInputs.platform === Platform.VSCode) {
            folder = getRootDirectory();
          }
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

export const DefaultAppNameFunc: FuncQuestion = {
  type: "func",
  name: CoreQuestionNames.DefaultAppNameFunc,
  func: (inputs: Inputs) => {
    const appName = path.basename(inputs.projectPath ?? "");
    const schema = {
      pattern: ProjectNamePattern,
      maxLength: 30,
    };
    const validateResult = jsonschema.validate(appName, schema);
    if (validateResult.errors && validateResult.errors.length > 0) {
      return undefined;
    }

    return appName;
  },
};

export function QuestionRootFolder(validateExistingProject = false): FolderQuestion {
  const question: FolderQuestion = {
    type: "folder",
    name: CoreQuestionNames.Folder,
    title: "Workspace folder",
    validation: {
      validFunc: async (folder: string, previousInputs?: Inputs): Promise<string | undefined> => {
        if (validateExistingProject && folder) {
          const isValid = isValidProject(folder);
          if (isValid) {
            return getLocalizedString("core.QuestionRootFolder.validation.projectExist", folder);
          }
        }
      },
    },
  };

  return question;
}

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
    if (capabilities && capabilities.includes && capabilities.includes(TabSPFxItem.id))
      return [{ id: "typescript", label: "TypeScript" }];
    return [
      { id: "javascript", label: "JavaScript" },
      { id: "typescript", label: "TypeScript" },
    ];
  },
  skipSingleOption: true,
  default: (inputs: Inputs) => {
    const capabilities = inputs[CoreQuestionNames.Capabilities] as string[];
    if (capabilities && capabilities.includes && capabilities.includes(TabSPFxItem.id))
      return "typescript";
    return "javascript";
  },
  placeholder: (inputs: Inputs): string => {
    const capabilities = inputs[CoreQuestionNames.Capabilities] as string[];
    if (capabilities && capabilities.includes && capabilities.includes(TabSPFxItem.id))
      return getLocalizedString("core.ProgrammingLanguageQuestion.placeholder.spfx");
    return getLocalizedString("core.ProgrammingLanguageQuestion.placeholder");
  },
};

function hasCapability(items: string[], optionItem: OptionItem): boolean {
  return items.includes(optionItem.id) || items.includes(optionItem.label);
}

// Items in set1 and set2 are mutally exclusive. Handle conflict by removing conflicting items with the newly added items.
// Assuming intersection of set1 and set2 are empty sets and no conflicts in newly added items.
export function handleSelectionConflict<T>(
  set1: Set<T>,
  set2: Set<T>,
  previous: Set<T>,
  current: Set<T>
): Set<T> {
  const addedItems = [...current].filter((item) => !previous.has(item));

  let conflicts: Set<T> | undefined = undefined;
  for (const addedItem of addedItems) {
    if (set1.has(addedItem)) {
      conflicts = set2;
      break;
    }
    if (set2.has(addedItem)) {
      conflicts = set1;
      break;
    }
  }

  const result = new Set<T>();
  for (const item of current) {
    if (!conflicts || !conflicts.has(item)) {
      result.add(item);
    }
  }
  return result;
}

export function createCapabilityQuestion(): MultiSelectQuestion {
  const staticOptions = [
    ...[TabOptionItem, BotOptionItem],
    ...(isBotNotificationEnabled() ? [NotificationOptionItem] : []),
    ...[MessageExtensionItem, TabSPFxItem],
  ];
  return {
    name: CoreQuestionNames.Capabilities,
    title: getLocalizedString("core.createCapabilityQuestion.title"),
    type: "multiSelect",
    staticOptions: staticOptions,
    default: [TabOptionItem.id],
    placeholder: getLocalizedString("core.createCapabilityQuestion.placeholder"),
    validation: {
      validFunc: async (input: string[]): Promise<string | undefined> => {
        const name = input as string[];
        if (name.length === 0) {
          return getLocalizedString("core.createCapabilityQuestion.placeholder");
        }

        if (name.length > 1 && hasCapability(name, TabSPFxItem)) {
          return getLocalizedString("core.createCapabilityQuestion.validation1");
        }

        if (hasCapability(name, BotOptionItem) && hasCapability(name, NotificationOptionItem)) {
          return getLocalizedString("core.createCapabilityQuestion.validation2");
        }

        if (
          hasCapability(name, MessageExtensionItem) &&
          hasCapability(name, NotificationOptionItem)
        ) {
          return getLocalizedString("core.createCapabilityQuestion.validation3");
        }

        return undefined;
      },
    },
    onDidChangeSelection: async function (
      currentSelectedIds: Set<string>,
      previousSelectedIds: Set<string>
    ): Promise<Set<string>> {
      if (currentSelectedIds.size > 1 && currentSelectedIds.has(TabSPFxItem.id)) {
        if (previousSelectedIds.has(TabSPFxItem.id)) {
          currentSelectedIds.delete(TabSPFxItem.id);
        } else {
          currentSelectedIds.clear();
          currentSelectedIds.add(TabSPFxItem.id);
        }
      }

      if (isBotNotificationEnabled()) {
        currentSelectedIds = handleSelectionConflict(
          new Set([BotOptionItem.id, MessageExtensionItem.id]),
          new Set([NotificationOptionItem.id]),
          previousSelectedIds,
          currentSelectedIds
        );
      }

      return currentSelectedIds;
    },
  };
}

export const QuestionSelectTargetEnvironment: SingleSelectQuestion = {
  type: "singleSelect",
  name: CoreQuestionNames.TargetEnvName,
  title: getLocalizedString("core.QuestionSelectTargetEnvironment.title"),
  staticOptions: [],
  skipSingleOption: true,
  forgetLastValue: true,
};

export function getQuestionNewTargetEnvironmentName(projectPath: string): TextInputQuestion {
  const WINDOWS_MAX_PATH_LENGTH = 260;
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

        const envFilePath = environmentManager.getEnvConfigPath(targetEnvName, projectPath);
        if (os.type() === "Windows_NT" && envFilePath.length >= WINDOWS_MAX_PATH_LENGTH) {
          return getLocalizedString("core.getQuestionNewTargetEnvironmentName.validation2");
        }

        if (targetEnvName === LocalEnvironmentName) {
          return getLocalizedString(
            "core.getQuestionNewTargetEnvironmentName.validation3",
            LocalEnvironmentName
          );
        }

        const envConfigs = await environmentManager.listRemoteEnvConfigs(projectPath);
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

export const QuestionSelectSourceEnvironment: SingleSelectQuestion = {
  type: "singleSelect",
  name: CoreQuestionNames.SourceEnvName,
  title: getLocalizedString("core.QuestionSelectSourceEnvironment.title"),
  staticOptions: [],
  skipSingleOption: true,
  forgetLastValue: true,
};

export const QuestionSelectResourceGroup: SingleSelectQuestion = {
  type: "singleSelect",
  name: CoreQuestionNames.TargetResourceGroupName,
  title: getLocalizedString("core.QuestionSelectResourceGroup.title"),
  staticOptions: [],
  skipSingleOption: true,
  forgetLastValue: true,
};

export const QuestionNewResourceGroupName: TextInputQuestion = {
  type: "text",
  name: CoreQuestionNames.NewResourceGroupName,
  title: getLocalizedString("core.QuestionNewResourceGroupName.title"),
  validation: {
    validFunc: async (input: string): Promise<string | undefined> => {
      const name = input as string;
      // https://docs.microsoft.com/en-us/rest/api/resources/resource-groups/create-or-update#uri-parameters
      const match = name.match(/^[-\w._()]+$/);
      if (!match) {
        return getLocalizedString("core.QuestionNewResourceGroupName.validation");
      }

      return undefined;
    },
  },
  placeholder: getLocalizedString("core.QuestionNewResourceGroupName.placeholder"),
  // default resource group name will change with env name
  forgetLastValue: true,
};

export const QuestionNewResourceGroupLocation: SingleSelectQuestion = {
  type: "singleSelect",
  name: CoreQuestionNames.NewResourceGroupLocation,
  title: getLocalizedString("core.QuestionNewResourceGroupLocation.title"),
  staticOptions: [],
};

export const ScratchOptionYesVSC: OptionItem = {
  id: "yes",
  label: `$(new-folder) ${getLocalizedString("core.ScratchOptionYesVSC.label")}`,
  detail: getLocalizedString("core.ScratchOptionYesVSC.detail"),
};

export const ScratchOptionNoVSC: OptionItem = {
  id: "no",
  label: `$(heart) ${getLocalizedString("core.ScratchOptionNoVSC.label")}`,
  detail: getLocalizedString("core.ScratchOptionNoVSC.detail"),
};

export const ScratchOptionYes: OptionItem = {
  id: "yes",
  label: getLocalizedString("core.ScratchOptionYes.label"),
  detail: getLocalizedString("core.ScratchOptionYes.detail"),
};

export const ScratchOptionNo: OptionItem = {
  id: "no",
  label: getLocalizedString("core.ScratchOptionNo.label"),
  detail: getLocalizedString("core.ScratchOptionNo.detail"),
};

export function getCreateNewOrFromSampleQuestion(platform: Platform): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: CoreQuestionNames.CreateFromScratch,
    title: getLocalizedString("core.getCreateNewOrFromSampleQuestion.title"),
    staticOptions:
      platform === Platform.VSCode
        ? [ScratchOptionYesVSC, ScratchOptionNoVSC]
        : [ScratchOptionYes, ScratchOptionNo],
    default: ScratchOptionYes.id,
    placeholder: getLocalizedString("core.getCreateNewOrFromSampleQuestion.placeholder"),
    skipSingleOption: true,
  };
}

export const SampleSelect: SingleSelectQuestion = {
  type: "singleSelect",
  name: CoreQuestionNames.Samples,
  title: getLocalizedString("core.SampleSelect.title"),
  staticOptions: sampleProvider.SampleCollection.samples.map((sample) => {
    return {
      id: sample.id,
      label: sample.title,
      detail: sample.shortDescription,
      data: sample.link,
    } as OptionItem;
  }),
  placeholder: getLocalizedString("core.SampleSelect.placeholder"),
};
