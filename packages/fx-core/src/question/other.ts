// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AppPackageFolderName,
  AzureAccountProvider,
  BuildFolderName,
  DynamicPlatforms,
  IQTreeNode,
  Inputs,
  LocalEnvironmentName,
  MultiSelectQuestion,
  OptionItem,
  Platform,
  SingleFileQuestion,
  SingleSelectQuestion,
  TextInputQuestion,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import { ConstantString } from "../common/constants";
import { getLocalizedString } from "../common/localizeUtils";
import { AppStudioScopes } from "../common/tools";
import { resourceGroupHelper } from "../component/utils/ResourceGroupHelper";
import { envUtil } from "../component/utils/envUtil";
import { CollaborationConstants, CollaborationUtil } from "../core/collaborator";
import { environmentManager } from "../core/environment";
import { TOOLS } from "../core/globalVars";
import {
  SPFxImportFolderQuestion,
  SPFxWebpartNameQuestion,
  apiOperationQuestion,
  apiSpecLocationQuestion,
} from "./create";
import { QuestionNames } from "./questionNames";

export function listCollaboratorQuestionNode(): IQTreeNode {
  const selectTeamsAppNode = selectTeamsAppManifestQuestionNode();
  selectTeamsAppNode.condition = { contains: CollaborationConstants.TeamsAppQuestionId };
  selectTeamsAppNode.children!.push({
    condition: envQuestionCondition,
    data: selectTargetEnvQuestion(QuestionNames.Env, false, false, ""),
  });
  const selectAadAppNode = selectAadAppManifestQuestionNode();
  selectAadAppNode.condition = { contains: CollaborationConstants.AadAppQuestionId };
  selectAadAppNode.children!.push({
    condition: envQuestionCondition,
    data: selectTargetEnvQuestion(QuestionNames.Env, false, false, ""),
  });
  return {
    data: { type: "group" },
    children: [
      {
        condition: (inputs: Inputs) => DynamicPlatforms.includes(inputs.platform),
        data: selectAppTypeQuestion(),
        cliOptionDisabled: "self",
        inputsDisabled: "self",
        children: [selectTeamsAppNode, selectAadAppNode],
      },
    ],
  };
}

export function grantPermissionQuestionNode(): IQTreeNode {
  const selectTeamsAppNode = selectTeamsAppManifestQuestionNode();
  selectTeamsAppNode.condition = { contains: CollaborationConstants.TeamsAppQuestionId };
  selectTeamsAppNode.children!.push({
    condition: envQuestionCondition,
    data: selectTargetEnvQuestion(QuestionNames.Env, false, false, ""),
  });
  const selectAadAppNode = selectAadAppManifestQuestionNode();
  selectAadAppNode.condition = { contains: CollaborationConstants.AadAppQuestionId };
  selectAadAppNode.children!.push({
    condition: envQuestionCondition,
    data: selectTargetEnvQuestion(QuestionNames.Env, false, false, ""),
  });
  return {
    data: { type: "group" },
    children: [
      {
        condition: (inputs: Inputs) => DynamicPlatforms.includes(inputs.platform),
        data: selectAppTypeQuestion(),
        cliOptionDisabled: "self",
        inputsDisabled: "self",
        children: [
          selectTeamsAppNode,
          selectAadAppNode,
          {
            data: inputUserEmailQuestion(),
          },
        ],
      },
    ],
  };
}

export function deployAadManifestQuestionNode(): IQTreeNode {
  return {
    data: { type: "group" },
    children: [
      {
        condition: (inputs: Inputs) => DynamicPlatforms.includes(inputs.platform),
        data: selectAadManifestQuestion(),
        children: [
          {
            condition: (inputs: Inputs) =>
              inputs.platform === Platform.VSCode && // confirm question only works for VSC
              inputs.projectPath !== undefined &&
              path.resolve(inputs[QuestionNames.AadAppManifestFilePath]) !==
                path.join(inputs.projectPath, "aad.manifest.json"),
            data: confirmManifestQuestion(false, false),
            cliOptionDisabled: "self",
            inputsDisabled: "self",
          },
          {
            condition: isAadMainifestContainsPlaceholder,
            data: selectTargetEnvQuestion(QuestionNames.Env, false, false, ""),
          },
        ],
      },
    ],
  };
}

export function validateTeamsAppQuestionNode(): IQTreeNode {
  return {
    data: selectTeamsAppValidationMethodQuestion(),
    cliOptionDisabled: "self",
    inputsDisabled: "self",
    children: [
      {
        condition: { equals: TeamsAppValidationOptions.schema().id },
        data: selectTeamsAppManifestQuestion(),
      },
      {
        condition: { equals: TeamsAppValidationOptions.package().id },
        data: selectTeamsAppPackageQuestion(),
      },
    ],
  };
}

export function selectTeamsAppManifestQuestionNode(): IQTreeNode {
  return {
    data: selectTeamsAppManifestQuestion(),
    children: [
      {
        condition: (inputs: Inputs) => confirmCondition(inputs, false),
        data: confirmManifestQuestion(true, false),
        cliOptionDisabled: "self",
        inputsDisabled: "self",
      },
    ],
  };
}

export function selectAadAppManifestQuestionNode(): IQTreeNode {
  return {
    data: selectAadManifestQuestion(),
    children: [
      {
        condition: (inputs: Inputs) =>
          inputs.platform === Platform.VSCode && // confirm question only works for VSC
          inputs.projectPath &&
          inputs[QuestionNames.AadAppManifestFilePath] &&
          path.resolve(inputs[QuestionNames.AadAppManifestFilePath]) !==
            path.join(inputs.projectPath, "aad.manifest.json"),
        data: confirmManifestQuestion(false, false),
        cliOptionDisabled: "self",
        inputsDisabled: "self",
      },
    ],
  };
}

function confirmCondition(inputs: Inputs, isLocal: boolean): boolean {
  return (
    inputs.platform === Platform.VSCode && // confirm question only works for VSC
    inputs.projectPath &&
    inputs[QuestionNames.TeamsAppManifestFilePath] &&
    path.resolve(inputs[QuestionNames.TeamsAppManifestFilePath]) !==
      path.join(
        inputs.projectPath,
        AppPackageFolderName,
        isLocal ? "manifest.local.json" : "manifest.json"
      )
  );
}

export function addWebPartQuestionNode(): IQTreeNode {
  return {
    data: SPFxImportFolderQuestion(true),
    children: [
      {
        data: SPFxWebpartNameQuestion(),
        children: [
          {
            data: selectTeamsAppManifestQuestion(),
            children: [
              {
                condition: (inputs: Inputs) => confirmCondition(inputs, false),
                data: confirmManifestQuestion(true, false),
                cliOptionDisabled: "self",
                inputsDisabled: "self",
              },
              {
                data: selectLocalTeamsAppManifestQuestion(),
                children: [
                  {
                    condition: (inputs: Inputs) => confirmCondition(inputs, true),
                    data: confirmManifestQuestion(true, true),
                    cliOptionDisabled: "self",
                    inputsDisabled: "self",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

function selectTeamsAppManifestQuestion(): SingleFileQuestion {
  return {
    name: QuestionNames.TeamsAppManifestFilePath,
    cliName: "teams-manifest-file",
    cliShortName: "t",
    cliDescription:
      "Specifies the Microsoft Teams app manifest template file path, it can be either absolute path or relative path to project root folder, defaults to './appPackage/manifest.json'",
    title: getLocalizedString("core.selectTeamsAppManifestQuestion.title"),
    type: "singleFile",
    default: (inputs: Inputs): string | undefined => {
      if (!inputs.projectPath) return undefined;
      const manifestPath = path.join(inputs.projectPath, AppPackageFolderName, "manifest.json");
      if (fs.pathExistsSync(manifestPath)) {
        return manifestPath;
      } else {
        return undefined;
      }
    },
  };
}

function selectLocalTeamsAppManifestQuestion(): SingleFileQuestion {
  return {
    name: QuestionNames.LocalTeamsAppManifestFilePath,
    cliName: "local-teams-manifest-file",
    cliShortName: "l",
    cliDescription:
      "Specifies the Microsoft Teams app manifest template file path for local environment, it can be either absolute path or relative path to project root folder, defaults to './appPackage/manifest.local.json'",
    title: getLocalizedString("core.selectLocalTeamsAppManifestQuestion.title"),
    type: "singleFile",
    default: (inputs: Inputs): string | undefined => {
      if (!inputs.projectPath) return undefined;
      const manifestPath = path.join(
        inputs.projectPath,
        AppPackageFolderName,
        "manifest.local.json"
      );
      if (fs.pathExistsSync(manifestPath)) {
        return manifestPath;
      } else {
        return undefined;
      }
    },
  };
}

function confirmManifestQuestion(isTeamsApp = true, isLocal = false): SingleSelectQuestion {
  const map: Record<string, string> = {
    true_true: QuestionNames.ConfirmLocalManifest,
    true_false: QuestionNames.ConfirmManifest,
    false_true: QuestionNames.ConfirmAadManifest,
    false_false: QuestionNames.ConfirmAadManifest,
  };
  const name = map[`${isTeamsApp.toString()}_${isLocal.toString()}`];
  return {
    name: name,
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
    dynamicOptions: (inputs: Inputs) => {
      return [
        {
          id: "manifest",
          label: `$(file) ${path.basename(
            isTeamsApp
              ? inputs[
                  isLocal
                    ? QuestionNames.LocalTeamsAppManifestFilePath
                    : QuestionNames.TeamsAppManifestFilePath
                ]
              : inputs[QuestionNames.AadAppManifestFilePath]
          )}`,
          description: path.dirname(
            isTeamsApp
              ? inputs[
                  isLocal
                    ? QuestionNames.LocalTeamsAppManifestFilePath
                    : QuestionNames.TeamsAppManifestFilePath
                ]
              : inputs[QuestionNames.AadAppManifestFilePath]
          ),
        },
      ];
    },
  };
}

function selectTeamsAppValidationMethodQuestion(): SingleSelectQuestion {
  return {
    name: QuestionNames.ValidateMethod,
    title: getLocalizedString("core.selectValidateMethodQuestion.validate.selectTitle"),
    staticOptions: [TeamsAppValidationOptions.schema(), TeamsAppValidationOptions.package()],
    type: "singleSelect",
  };
}

export function copilotPluginAddAPIQuestionNode(): IQTreeNode {
  return {
    data: apiSpecLocationQuestion(false),
    children: [
      {
        data: apiOperationQuestion(false),
      },
    ],
  };
}

export class TeamsAppValidationOptions {
  static schema(): OptionItem {
    return {
      id: "validateAgainstSchema",
      label: getLocalizedString("core.selectValidateMethodQuestion.validate.schemaOption"),
      description: getLocalizedString(
        "core.selectValidateMethodQuestion.validate.schemaOptionDescription"
      ),
    };
  }
  static package(): OptionItem {
    return {
      id: "validateAgainstPackage",
      label: getLocalizedString("core.selectValidateMethodQuestion.validate.appPackageOption"),
      description: getLocalizedString(
        "core.selectValidateMethodQuestion.validate.appPackageOptionDescription"
      ),
    };
  }
}

function selectTeamsAppPackageQuestion(): SingleFileQuestion {
  return {
    name: QuestionNames.TeamsAppPackageFilePath,
    title: getLocalizedString("core.selectTeamsAppPackageQuestion.title"),
    cliDescription:
      "Specifies the zipped Microsoft Teams app package path, it's a relative path to project root folder, defaults to '${folder}/appPackage/build/appPackage.${env}.zip'",
    cliName: "app-package-file",
    cliShortName: "p",
    type: "singleFile",
    default: (inputs: Inputs): string | undefined => {
      if (!inputs.projectPath) return undefined;
      const appPackagePath: string = path.join(
        inputs.projectPath,
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

export function selectTeamsAppPackageQuestionNode(): IQTreeNode {
  return {
    data: selectTeamsAppPackageQuestion(),
  };
}

export enum HubTypes {
  teams = "teams",
  outlook = "outlook",
  office = "office",
}

export class HubOptions {
  static teams(): OptionItem {
    return {
      id: "teams",
      label: "Teams",
    };
  }
  static outlook(): OptionItem {
    return {
      id: "outlook",
      label: "Outlook",
    };
  }
  static office(): OptionItem {
    return {
      id: "office",
      label: "the Microsoft 365 app",
    };
  }
  static all(): OptionItem[] {
    return [this.teams(), this.outlook(), this.office()];
  }
}

function selectM365HostQuestion(): SingleSelectQuestion {
  return {
    name: QuestionNames.M365Host,
    cliShortName: "m",
    cliDescription: "Preview the application in Teams, Outlook or the Microsoft 365 app.",
    title: getLocalizedString("core.M365HostQuestion.title"),
    default: HubOptions.teams().id,
    type: "singleSelect",
    staticOptions: HubOptions.all(),
    placeholder: getLocalizedString("core.M365HostQuestion.placeholder"),
  };
}

export function previewWithTeamsAppManifestQuestionNode(): IQTreeNode {
  return {
    data: { type: "group" },
    children: [
      {
        data: selectM365HostQuestion(),
      },
      selectTeamsAppManifestQuestionNode(),
    ],
  };
}

export function selectTargetEnvQuestion(
  questionName = QuestionNames.TargetEnvName,
  remoteOnly = true,
  throwErrorIfNoEnv = false,
  defaultValueIfNoEnv = environmentManager.getDefaultEnvName()
): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: questionName,
    title: getLocalizedString("core.QuestionSelectTargetEnvironment.title"),
    cliName: "env",
    cliDescription: "Specifies the environment name for the project.",
    staticOptions: [],
    dynamicOptions: async (inputs: Inputs) => {
      if (!inputs.projectPath) return [];
      const res = await envUtil.listEnv(inputs.projectPath, remoteOnly);
      if (res.isErr()) {
        if (throwErrorIfNoEnv) throw res.error;
        return [defaultValueIfNoEnv];
      }
      return res.value;
    },
    skipSingleOption: true,
    forgetLastValue: true,
  };
}

async function getDefaultUserEmail() {
  if (!TOOLS?.tokenProvider.m365TokenProvider) return undefined;
  const jsonObjectRes = await TOOLS.tokenProvider.m365TokenProvider.getJsonObject({
    scopes: AppStudioScopes,
  });
  if (jsonObjectRes.isErr()) {
    throw jsonObjectRes.error;
  }
  const jsonObject = jsonObjectRes.value;
  const currentUserEmail = (jsonObject as any).upn as string;
  let defaultUserEmail = "";
  if (currentUserEmail && currentUserEmail.indexOf("@") > 0) {
    defaultUserEmail = "[UserName]@" + currentUserEmail.split("@")[1];
  }
  return defaultUserEmail;
}

export function inputUserEmailQuestion(): TextInputQuestion {
  return {
    name: QuestionNames.UserEmail,
    type: "text",
    title: getLocalizedString("core.getUserEmailQuestion.title"),
    cliDescription: "Email address of the collaborator.",
    default: getDefaultUserEmail,
    validation: {
      validFunc: async (input: string, previousInputs?: Inputs) => {
        if (!input || input.trim() === "") {
          return getLocalizedString("core.getUserEmailQuestion.validation1");
        }

        input = input.trim();
        const defaultUserEmail = await getDefaultUserEmail();
        if (input === defaultUserEmail) {
          return getLocalizedString("core.getUserEmailQuestion.validation2");
        }

        const re = /\S+@\S+\.\S+/;
        if (!re.test(input)) {
          return getLocalizedString("core.getUserEmailQuestion.validation3");
        }
        return undefined;
      },
    },
  };
}

export async function isAadMainifestContainsPlaceholder(inputs: Inputs): Promise<boolean> {
  const aadManifestPath = inputs?.[QuestionNames.AadAppManifestFilePath];
  const placeholderRegex = /\$\{\{ *[a-zA-Z0-9_.-]* *\}\}/g;
  const regexObj = new RegExp(placeholderRegex);
  try {
    if (!aadManifestPath || !(await fs.pathExists(aadManifestPath))) {
      return false;
    }
    const manifest = await fs.readFile(aadManifestPath, ConstantString.UTF8Encoding);
    if (regexObj.test(manifest)) {
      return true;
    }
  } catch (e) {
    return false;
  }
  return false;
}

export function selectAadManifestQuestion(): SingleFileQuestion {
  return {
    name: QuestionNames.AadAppManifestFilePath,
    cliName: "aad-manifest-file",
    cliShortName: "a",
    cliDescription:
      "Specifies the Azure AD app manifest file path, can be either absolute path or relative path to project root folder, defaults to './aad.manifest.json'",
    title: getLocalizedString("core.selectAadAppManifestQuestion.title"),
    type: "singleFile",
    default: (inputs: Inputs): string | undefined => {
      if (!inputs.projectPath) return undefined;
      const manifestPath: string = path.join(inputs.projectPath, "aad.manifest.json");
      if (fs.pathExistsSync(manifestPath)) {
        return manifestPath;
      } else {
        return undefined;
      }
    },
  };
}

function selectAppTypeQuestion(): MultiSelectQuestion {
  return {
    name: QuestionNames.collaborationAppType,
    title: getLocalizedString("core.selectCollaborationAppTypeQuestion.title"),
    type: "multiSelect",
    staticOptions: [
      {
        id: CollaborationConstants.AadAppQuestionId,
        label: getLocalizedString("core.aadAppQuestion.label"),
        description: getLocalizedString("core.aadAppQuestion.description"),
      },
      {
        id: CollaborationConstants.TeamsAppQuestionId,
        label: getLocalizedString("core.teamsAppQuestion.label"),
        description: getLocalizedString("core.teamsAppQuestion.description"),
      },
    ],
    validation: { minItems: 1 },
    validationHelp: "Please select at least one app type.",
  };
}

export async function envQuestionCondition(inputs: Inputs): Promise<boolean> {
  const appType = inputs[CollaborationConstants.AppType] as string[];
  const requireAad = appType?.includes(CollaborationConstants.AadAppQuestionId);
  const requireTeams = appType?.includes(CollaborationConstants.TeamsAppQuestionId);
  const aadManifestPath = inputs[QuestionNames.AadAppManifestFilePath];
  const teamsManifestPath = inputs[QuestionNames.TeamsAppManifestFilePath];

  // When both is selected, only show the question once at the end
  if ((requireAad && !aadManifestPath) || (requireTeams && !teamsManifestPath)) {
    return false;
  }

  // Only show env question when manifest id is referencing value from .env file
  let requireEnv = false;
  if (requireTeams && teamsManifestPath) {
    const teamsAppIdRes = await CollaborationUtil.loadManifestId(teamsManifestPath);
    if (teamsAppIdRes.isOk()) {
      requireEnv = CollaborationUtil.requireEnvQuestion(teamsAppIdRes.value);
      if (requireEnv) {
        return true;
      }
    } else {
      return false;
    }
  }

  if (requireAad && aadManifestPath) {
    const aadAppIdRes = await CollaborationUtil.loadManifestId(aadManifestPath);
    if (aadAppIdRes.isOk()) {
      requireEnv = CollaborationUtil.requireEnvQuestion(aadAppIdRes.value);
      if (requireEnv) {
        return true;
      }
    } else {
      return false;
    }
  }

  return false;
}
export async function newEnvNameValidation(
  input: string,
  inputs?: Inputs
): Promise<string | undefined> {
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
  if (!inputs?.projectPath) return "Project path is not defined";
  const envListRes = await envUtil.listEnv(inputs.projectPath, true);
  if (envListRes.isErr()) {
    return getLocalizedString("core.getQuestionNewTargetEnvironmentName.validation4");
  }

  inputs.existingEnvNames = envListRes.value; //cache existing env names

  const found =
    envListRes.value.find(
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
}
export function newTargetEnvQuestion(): TextInputQuestion {
  return {
    type: "text",
    name: QuestionNames.NewTargetEnvName,
    cliName: "name",
    cliDescription: "Specifies the new environment name.",
    cliType: "argument",
    title: getLocalizedString("core.getQuestionNewTargetEnvironmentName.title"),
    validation: {
      validFunc: newEnvNameValidation,
    },
    placeholder: getLocalizedString("core.getQuestionNewTargetEnvironmentName.placeholder"),
  };
}
// export const lastUsedMark = " (last used)";
// let lastUsedEnv: string | undefined;
// export function reOrderEnvironments(environments: Array<string>): Array<string> {
//   if (!lastUsedEnv) {
//     return environments;
//   }

//   const index = environments.indexOf(lastUsedEnv);
//   if (index === -1) {
//     return environments;
//   }

//   return [lastUsedEnv + lastUsedMark]
//     .concat(environments.slice(0, index))
//     .concat(environments.slice(index + 1));
// }
export function selectSourceEnvQuestion(): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: QuestionNames.SourceEnvName,
    cliName: "env",
    title: getLocalizedString("core.QuestionSelectSourceEnvironment.title"),
    cliDescription: "Specifies an existing environment name to copy from.",
    staticOptions: [],
    dynamicOptions: async (inputs: Inputs) => {
      if (inputs.existingEnvNames) {
        const envList = inputs.existingEnvNames;
        return envList;
      } else if (inputs.projectPath) {
        const envListRes = await envUtil.listEnv(inputs.projectPath, true);
        if (envListRes.isErr()) {
          throw envListRes.error;
        }
        return envListRes.value;
      }
      return [];
    },
    skipSingleOption: true,
    forgetLastValue: true,
  };
}

export function createNewEnvQuestionNode(): IQTreeNode {
  return {
    data: newTargetEnvQuestion(),
    children: [
      {
        data: selectSourceEnvQuestion(),
      },
    ],
  };
}

export const newResourceGroupOption = "+ New resource group";

/**
 * select existing resource group or create new resource group
 */
function selectResourceGroupQuestion(
  azureAccountProvider: AzureAccountProvider,
  subscriptionId: string
): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: QuestionNames.TargetResourceGroupName,
    title: getLocalizedString("core.QuestionSelectResourceGroup.title"),
    staticOptions: [{ id: newResourceGroupOption, label: newResourceGroupOption }],
    dynamicOptions: async (inputs: Inputs): Promise<OptionItem[]> => {
      const rmClient = await resourceGroupHelper.createRmClient(
        azureAccountProvider,
        subscriptionId
      );
      const listRgRes = await resourceGroupHelper.listResourceGroups(rmClient);
      if (listRgRes.isErr()) throw listRgRes.error;
      const rgList = listRgRes.value;
      const options: OptionItem[] = rgList.map((rg) => {
        return {
          id: rg[0],
          label: rg[0],
          description: rg[1],
        };
      });
      const existingResourceGroupNames = rgList.map((rg) => rg[0]);
      inputs.existingResourceGroupNames = existingResourceGroupNames; // cache existing resource group names for valiation usage
      return [{ id: newResourceGroupOption, label: newResourceGroupOption }, ...options];
    },
    skipSingleOption: true,
    returnObject: true,
    forgetLastValue: true,
  };
}

export function validateResourceGroupName(input: string, inputs?: Inputs): string | undefined {
  const name = input;
  // https://docs.microsoft.com/en-us/rest/api/resources/resource-groups/create-or-update#uri-parameters
  const match = name.match(/^[-\w._()]+$/);
  if (!match) {
    return getLocalizedString("core.QuestionNewResourceGroupName.validation");
  }

  // To avoid the issue in CLI that using async func for validation and filter will make users input answers twice,
  // we check the existence of a resource group from the list rather than call the api directly for now.
  // Bug: https://msazure.visualstudio.com/Microsoft%20Teams%20Extensibility/_workitems/edit/15066282
  // GitHub issue: https://github.com/SBoudrias/Inquirer.js/issues/1136
  if (inputs?.existingResourceGroupNames) {
    const maybeExist =
      inputs.existingResourceGroupNames.findIndex(
        (o: string) => o.toLowerCase() === input.toLowerCase()
      ) >= 0;
    if (maybeExist) {
      return `resource group already exists: ${name}`;
    }
  }
  return undefined;
}

export function newResourceGroupNameQuestion(defaultResourceGroupName: string): TextInputQuestion {
  return {
    type: "text",
    name: QuestionNames.NewResourceGroupName,
    title: getLocalizedString("core.QuestionNewResourceGroupName.title"),
    placeholder: getLocalizedString("core.QuestionNewResourceGroupName.placeholder"),
    // default resource group name will change with env name
    forgetLastValue: true,
    default: defaultResourceGroupName,
    validation: {
      validFunc: validateResourceGroupName,
    },
  };
}

function selectResourceGroupLocationQuestion(
  azureAccountProvider: AzureAccountProvider,
  subscriptionId: string
): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: QuestionNames.NewResourceGroupLocation,
    title: getLocalizedString("core.QuestionNewResourceGroupLocation.title"),
    staticOptions: [],
    dynamicOptions: async (inputs: Inputs) => {
      const rmClient = await resourceGroupHelper.createRmClient(
        azureAccountProvider,
        subscriptionId
      );
      const getLocationsRes = await resourceGroupHelper.getLocations(
        azureAccountProvider,
        rmClient
      );
      if (getLocationsRes.isErr()) {
        throw getLocationsRes.error;
      }
      return getLocationsRes.value;
    },
    default: "Central US",
  };
}

export function resourceGroupQuestionNode(
  azureAccountProvider: AzureAccountProvider,
  subscriptionId: string,
  defaultResourceGroupName: string
): IQTreeNode {
  return {
    data: selectResourceGroupQuestion(azureAccountProvider, subscriptionId),
    children: [
      {
        condition: { equals: newResourceGroupOption },
        data: newResourceGroupNameQuestion(defaultResourceGroupName),
        children: [
          {
            data: selectResourceGroupLocationQuestion(azureAccountProvider, subscriptionId),
          },
        ],
      },
    ],
  };
}
