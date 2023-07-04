import {
  AppPackageFolderName,
  FxError,
  IQTreeNode,
  Inputs,
  Platform,
  QTreeNode,
  Result,
  SingleFileQuestion,
  SingleSelectQuestion,
  ok,
} from "@microsoft/teamsfx-api";
import { SPFxImportFolderQuestion, SPFxWebpartNameQuestion } from "./create";
import { QuestionNames } from "./questionNames";
import * as path from "path";
import fs from "fs-extra";
import { getLocalizedString } from "../common/localizeUtils";

export function getQuestionsForAddWebpart(): Result<QTreeNode | undefined, FxError> {
  return ok(addWebPartQuestionTreeNode() as QTreeNode);
}

function addWebPartQuestionTreeNode(): IQTreeNode {
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
                condition: (inputs: Inputs) =>
                  inputs.platform !== Platform.CLI_HELP &&
                  inputs.platform !== Platform.CLI &&
                  inputs.platform !== Platform.VS &&
                  inputs[QuestionNames.TeamsAppManifestFilePath] !==
                    path.join(inputs.projectPath!, AppPackageFolderName, "manifest.json"),
                data: confirmManifestQuestion(true, false),
              },
              {
                data: selectTeamsAppManifestQuestion(true),
                children: [
                  {
                    condition: (inputs: Inputs) =>
                      inputs.platform !== Platform.CLI_HELP &&
                      inputs.platform !== Platform.CLI &&
                      inputs.platform !== Platform.VS &&
                      inputs[QuestionNames.TeamsAppManifestFilePath] !==
                        path.join(inputs.projectPath!, AppPackageFolderName, "manifest.local.json"),
                    data: confirmManifestQuestion(true, true),
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

function selectTeamsAppManifestQuestion(isLocal = false): SingleFileQuestion {
  return {
    name: isLocal
      ? QuestionNames.LocalTeamsAppManifestFilePath
      : QuestionNames.TeamsAppManifestFilePath,
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
}

function confirmManifestQuestion(isTeamsApp = true, isLocal = false): SingleSelectQuestion {
  return {
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
