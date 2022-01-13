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
import { getRootDirectory } from "../common/tools";

export enum CoreQuestionNames {
  AppName = "app-name",
  DefaultAppNameFunc = "default-app-name-func",
  Folder = "folder",
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

export const QuestionAppName: TextInputQuestion = {
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
          return "Application name must start with a letter and can only contain letters and digits.";
        } else {
          return "Application name length must be shorter than 30.";
        }
      }
      const projectPath = path.resolve(getRootDirectory(), appName);
      const exists = await fs.pathExists(projectPath);
      if (exists) return `Path exists: ${projectPath}. Select a different application name.`;
      return undefined;
    },
  },
  placeholder: "Application name",
};

export const QuestionV1AppName: TextInputQuestion = {
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
          return "Application name must start with a letter and can only contain letters and digits.";
        } else {
          return "Application name length must be shorter than 30.";
        }
      }
      return undefined;
    },
  },
  placeholder: "Application name",
};

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

export const QuestionRootFolder: FolderQuestion = {
  type: "folder",
  name: CoreQuestionNames.Folder,
  title: "Workspace folder",
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
    const caps = inputs[CoreQuestionNames.Capabilities] as string[];
    if (caps.includes(TabSPFxItem.id)) return [{ id: "typescript", label: "TypeScript" }];
    return [
      { id: "javascript", label: "JavaScript" },
      { id: "typescript", label: "TypeScript" },
    ];
  },
  skipSingleOption: true,
  default: (inputs: Inputs) => {
    const cpas = inputs[CoreQuestionNames.Capabilities] as string[];
    if (cpas.includes(TabSPFxItem.id)) return "typescript";
    return "javascript";
  },
  placeholder: (inputs: Inputs): string => {
    const cpas = inputs[CoreQuestionNames.Capabilities] as string[];
    if (cpas.includes(TabSPFxItem.id)) return "SPFx is currently supporting TypeScript only.";
    return "Select a programming language.";
  },
};

export const TabOptionItem: OptionItem = {
  id: "Tab",
  label: "Tab",
  cliName: "tab",
  description: "UI-based app",
  detail: "Teams-aware webpages embedded in Microsoft Teams",
};

export const BotOptionItem: OptionItem = {
  id: "Bot",
  label: "Bot",
  cliName: "bot",
  description: "Conversational Agent",
  detail: "Running simple and repetitive automated tasks through conversations",
};

export const MessageExtensionItem: OptionItem = {
  id: "MessagingExtension",
  label: "Messaging Extension",
  cliName: "messaging-extension",
  description: "Custom UI when users compose messages in Teams",
  detail: "Inserting app content or acting on a message without leaving the conversation",
};

export const TabSPFxItem: OptionItem = {
  id: "TabSPFx",
  label: "Tab(SPFx)",
  cliName: "tab-spfx",
  description: "UI-base app with SPFx framework",
  detail: "Teams-aware webpages with SPFx framework embedded in Microsoft Teams",
};

export function createCapabilityQuestion(): MultiSelectQuestion {
  return {
    name: CoreQuestionNames.Capabilities,
    title: "Select capabilities",
    type: "multiSelect",
    staticOptions: [TabOptionItem, BotOptionItem, MessageExtensionItem, TabSPFxItem],
    default: [TabOptionItem.id],
    placeholder: "Select at least 1 capability",
    validation: {
      validFunc: async (input: string[]): Promise<string | undefined> => {
        const name = input as string[];
        if (name.length === 0) {
          return "Select at least 1 capability";
        }
        if (
          name.length > 1 &&
          (name.includes(TabSPFxItem.id) || name.includes(TabSPFxItem.label))
        ) {
          return "Teams Toolkit offers only the Tab capability in a Teams app with Visual Studio Code and SharePoint Framework. The Bot and Messaging extension capabilities are not available";
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

      return currentSelectedIds;
    },
  };
}

export const QuestionSelectTargetEnvironment: SingleSelectQuestion = {
  type: "singleSelect",
  name: CoreQuestionNames.TargetEnvName,
  title: "Select an environment",
  staticOptions: [],
  skipSingleOption: true,
  forgetLastValue: true,
};

export function getQuestionNewTargetEnvironmentName(projectPath: string): TextInputQuestion {
  const WINDOWS_MAX_PATH_LENGTH = 260;
  return {
    type: "text",
    name: CoreQuestionNames.NewTargetEnvName,
    title: "New environment name",
    validation: {
      validFunc: async (input: string): Promise<string | undefined> => {
        const targetEnvName = input;
        const match = targetEnvName.match(environmentManager.envNameRegex);
        if (!match) {
          return "Environment name can only contain letters, digits, _ and -.";
        }

        const envFilePath = environmentManager.getEnvConfigPath(targetEnvName, projectPath);
        if (os.type() === "Windows_NT" && envFilePath.length >= WINDOWS_MAX_PATH_LENGTH) {
          return "The length of environment config path will exceed the limitation of Windows.";
        }

        if (targetEnvName === LocalEnvironmentName) {
          return `Cannot create an environment '${LocalEnvironmentName}'`;
        }

        const envConfigs = await environmentManager.listEnvConfigs(projectPath);
        if (envConfigs.isErr()) {
          return `Failed to list env configs`;
        }

        const found =
          envConfigs.value.find(
            (env) => env.localeCompare(targetEnvName, undefined, { sensitivity: "base" }) === 0
          ) !== undefined;
        if (found) {
          return `Project environment ${targetEnvName} already exists.`;
        } else {
          return undefined;
        }
      },
    },
    placeholder: "New environment name",
  };
}

export const QuestionSelectSourceEnvironment: SingleSelectQuestion = {
  type: "singleSelect",
  name: CoreQuestionNames.SourceEnvName,
  title: "Select an environment to create copy",
  staticOptions: [],
  skipSingleOption: true,
  forgetLastValue: true,
};

export const QuestionSelectResourceGroup: SingleSelectQuestion = {
  type: "singleSelect",
  name: CoreQuestionNames.TargetResourceGroupName,
  title: "Select a resource group",
  staticOptions: [],
  skipSingleOption: true,
  forgetLastValue: true,
};

export const QuestionNewResourceGroupName: TextInputQuestion = {
  type: "text",
  name: CoreQuestionNames.NewResourceGroupName,
  title: "New resource group name",
  validation: {
    validFunc: async (input: string): Promise<string | undefined> => {
      const name = input as string;
      // https://docs.microsoft.com/en-us/rest/api/resources/resource-groups/create-or-update#uri-parameters
      const match = name.match(/^[-\w._()]+$/);
      if (!match) {
        return "The name can only contain alphanumeric characters or the symbols ._-()";
      }

      return undefined;
    },
  },
  placeholder: "New resource group name",
  // default resource group name will change with env name
  forgetLastValue: true,
};

export const QuestionNewResourceGroupLocation: SingleSelectQuestion = {
  type: "singleSelect",
  name: CoreQuestionNames.NewResourceGroupLocation,
  title: "Location for the new resource group",
  staticOptions: [],
};

export const QuestionSelectSolution: SingleSelectQuestion = {
  type: "singleSelect",
  name: CoreQuestionNames.Solution,
  title: "Select a solution",
  staticOptions: [],
  skipSingleOption: true,
};

export const ScratchOptionYesVSC: OptionItem = {
  id: "yes",
  label: "$(new-folder) Create a new Teams app",
  detail: "Use the Teams Toolkit to create a new application.",
};

export const ScratchOptionNoVSC: OptionItem = {
  id: "no",
  label: "$(heart) Start from a sample",
  detail: "Use an existing sample as a starting point for your new application.",
};

export const ScratchOptionYes: OptionItem = {
  id: "yes",
  label: "Create a new Teams app",
  detail: "Use the Teams Toolkit to create a new application.",
};

export const ScratchOptionNo: OptionItem = {
  id: "no",
  label: "Start from a sample",
  detail: "Use an existing sample as a starting point for your new application.",
};

export function getCreateNewOrFromSampleQuestion(platform: Platform): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: CoreQuestionNames.CreateFromScratch,
    title: "Teams Toolkit: Create a new Teams app",
    staticOptions:
      platform === Platform.VSCode
        ? [ScratchOptionYesVSC, ScratchOptionNoVSC]
        : [ScratchOptionYes, ScratchOptionNo],
    default: ScratchOptionYes.id,
    placeholder: "Select an option",
    skipSingleOption: true,
  };
}

export const SampleSelect: SingleSelectQuestion = {
  type: "singleSelect",
  name: CoreQuestionNames.Samples,
  title: "Start from a sample",
  staticOptions: sampleProvider.SampleCollection.samples.map((sample) => {
    return {
      id: sample.id,
      label: sample.title,
      detail: sample.shortDescription,
      data: sample.link,
    } as OptionItem;
  }),
  placeholder: "Select a sample",
};
