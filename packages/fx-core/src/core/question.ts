// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as fs from "fs-extra";
import * as path from "path";

/**
 * @author Huajie Zhang <zhjay23@qq.com>
 */
import {
  AppPackageFolderName,
  BuildFolderName,
  DynamicPlatforms,
  FxError,
  Inputs,
  LocalEnvironmentName,
  ok,
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
import { environmentManager } from "./environment";

export enum CoreQuestionNames {
  SourceEnvName = "sourceEnvName",
  TargetEnvName = "targetEnvName",
  TargetResourceGroupName = "targetResourceGroupName",
  NewResourceGroupName = "newResourceGroupName",
  NewResourceGroupLocation = "newResourceGroupLocation",
  NewTargetEnvName = "newTargetEnvName",
  ExistingTabEndpoint = "existing-tab-endpoint",
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
  envNode.condition = validateAadManifestContainsPlaceholder;
  return aadAppSelectNode;
}

export async function validateAadManifestContainsPlaceholder(inputs: Inputs): Promise<boolean> {
  const aadManifestPath = inputs?.[CoreQuestionNames.AadAppManifestFilePath];
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

export function selectM365HostQuestion(): QTreeNode {
  return new QTreeNode({
    name: CoreQuestionNames.M365Host,
    title: getLocalizedString("core.M365HostQuestion.title"),
    type: "singleSelect",
    staticOptions: [Hub.teams, Hub.outlook, Hub.office],
    placeholder: getLocalizedString("core.M365HostQuestion.placeholder"),
  });
}
