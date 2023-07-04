// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as fs from "fs-extra";
import * as path from "path";

/**
 * @author Huajie Zhang <zhjay23@qq.com>
 */
import {
  Inputs,
  LocalEnvironmentName,
  QTreeNode,
  SingleFileQuestion,
  SingleSelectQuestion,
  StaticOptions,
  TextInputQuestion,
} from "@microsoft/teamsfx-api";

import { ConstantString } from "../common/constants";
import { getLocalizedString } from "../common/localizeUtils";
import { QuestionNames } from "../question/questionNames";
import { environmentManager } from "./environment";

function QuestionSelectTargetEnvironment(): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: QuestionNames.TargetEnvName,
    title: getLocalizedString("core.QuestionSelectTargetEnvironment.title"),
    staticOptions: [],
    skipSingleOption: true,
    forgetLastValue: true,
  };
}

export function getQuestionNewTargetEnvironmentName(projectPath: string): TextInputQuestion {
  return {
    type: "text",
    name: QuestionNames.NewTargetEnvName,
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
    name: QuestionNames.SourceEnvName,
    title: getLocalizedString("core.QuestionSelectSourceEnvironment.title"),
    staticOptions: [],
    skipSingleOption: true,
    forgetLastValue: true,
  };
}
export function QuestionSelectResourceGroup(): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: QuestionNames.TargetResourceGroupName,
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
    name: QuestionNames.NewResourceGroupName,
    title: getLocalizedString("core.QuestionNewResourceGroupName.title"),
    placeholder: getLocalizedString("core.QuestionNewResourceGroupName.placeholder"),
    // default resource group name will change with env name
    forgetLastValue: true,
  };
}

export function QuestionNewResourceGroupLocation(): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: QuestionNames.NewResourceGroupLocation,
    title: getLocalizedString("core.QuestionNewResourceGroupLocation.title"),
    staticOptions: [],
  };
}

export function selectAadAppManifestQuestion(inputs: Inputs): QTreeNode {
  const manifestPath: string = path.join(inputs.projectPath!, "aad.manifest.json");

  const aadAppManifestNode: SingleFileQuestion = {
    name: QuestionNames.AadAppManifestFilePath,
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
    name: isLocal ? QuestionNames.ConfirmLocalManifest : QuestionNames.ConfirmManifest,
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
  };
  const confirmManifestNode = new QTreeNode(confirmManifestQuestion);
  confirmManifestNode.condition = {
    notEquals: defaultManifestFilePath,
  };
  return confirmManifestNode;
}

export async function validateAadManifestContainsPlaceholder(inputs: Inputs): Promise<boolean> {
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
