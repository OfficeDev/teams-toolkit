import {
  AppPackageFolderName,
  BuildFolderName,
  DynamicPlatforms,
  FxError,
  IQTreeNode,
  Inputs,
  MultiSelectQuestion,
  OptionItem,
  Platform,
  QTreeNode,
  Result,
  SingleFileQuestion,
  SingleSelectQuestion,
  TextInputQuestion,
  ok,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import { ConstantString } from "../common/constants";
import { getLocalizedString } from "../common/localizeUtils";
import { Hub } from "../common/m365/constants";
import { envUtil } from "../component/utils/envUtil";
import { environmentManager } from "../core/environment";
import { SPFxImportFolderQuestion, SPFxWebpartNameQuestion } from "./create";
import { QuestionNames } from "./questionNames";
import { CollaborationConstants, CollaborationUtil } from "../core/collaborator";
import { TOOLS } from "../core/globalVars";
import { AppStudioScopes } from "../common/tools";

//// getQuestionsXXXX
export function getQuestionsForAddWebpart(): Result<IQTreeNode | undefined, FxError> {
  return ok(addWebPartQuestionNode());
}

export function getQuestionsForSelectTeamsAppManifest(): Result<IQTreeNode | undefined, FxError> {
  return ok(selectTeamsAppManifestQuestionNode());
}

export function getQuestionsForValidateMethod(): Result<IQTreeNode | undefined, FxError> {
  return ok({
    data: selectTeamsAppValidationMethodQuestion(),
  });
}

export function getQuestionsForValidateAppPackage(): Result<IQTreeNode | undefined, FxError> {
  return ok({
    data: selectTeamsAppPackageQuestion(),
  });
}

export function getQuestionsForPreviewWithManifest(): Result<IQTreeNode | undefined, FxError> {
  return ok(previewWithTeamsAppManifestNode());
}

export function getQuestionsForListCollaborator(): Result<IQTreeNode | undefined, FxError> {
  return ok(listCollaboratorQuestionNode());
}

export function getQuestionsForGrantPermission(): Result<IQTreeNode | undefined, FxError> {
  const selectTeamsAppNode = selectTeamsAppManifestQuestionNode();
  selectTeamsAppNode.condition = { contains: CollaborationConstants.TeamsAppQuestionId };
  const selectAadAppNode = selectAadAppManifestQuestionNode();
  selectAadAppNode.condition = { contains: CollaborationConstants.AadAppQuestionId };
  return ok({
    data: { type: "group" },
    children: [
      {
        condition: (inputs: Inputs) => DynamicPlatforms.includes(inputs.platform),
        data: selectAppTypeQuestion(),
        children: [
          selectTeamsAppNode,
          selectAadAppNode,
          {
            condition: envQuestionCondition,
            data: selectTargetEnvQuestion(QuestionNames.Env, false, false, ""),
          },
          {
            data: inputUserEmailQuestion(),
          },
        ],
      },
    ],
  } as QTreeNode);
}

export function getQuestionForDeployAadManifest(): Result<QTreeNode | undefined, FxError> {
  return ok({
    data: { type: "group" },
    children: [
      {
        condition: (inputs: Inputs) => DynamicPlatforms.includes(inputs.platform),
        data: selectAadManifestQuestion(),
        children: [
          {
            condition: (inputs: Inputs) =>
              path.resolve(inputs[QuestionNames.AadAppManifestFilePath]) !==
              path.join(inputs.projectPath!, "aad.manifest.json"),
            data: confirmManifestQuestion(false, false),
          },
          {
            condition: isAadMainifestContainsPlaceholder,
            data: selectTargetEnvQuestion(QuestionNames.Env, false, false, ""),
          },
        ],
      },
    ],
  } as QTreeNode);
}

export function selectTeamsAppManifestQuestionNode(): IQTreeNode {
  return {
    data: selectTeamsAppManifestQuestion(),
    children: [
      {
        condition: (inputs: Inputs) => confirmCondition(inputs, false),
        data: confirmManifestQuestion(true, false),
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
          path.resolve(inputs[QuestionNames.AadAppManifestFilePath]) !==
          path.join(inputs.projectPath!, "aad.manifest.json"),
        data: confirmManifestQuestion(false, false),
      },
    ],
  };
}

function confirmCondition(inputs: Inputs, isLocal: boolean): boolean {
  return (
    inputs.platform !== Platform.CLI_HELP &&
    inputs.platform !== Platform.CLI &&
    inputs.platform !== Platform.VS &&
    path.resolve(inputs[QuestionNames.TeamsAppManifestFilePath]) !==
      path.join(
        inputs.projectPath!,
        AppPackageFolderName,
        isLocal ? "manifest.local.json" : "manifest.json"
      )
  );
}

function addWebPartQuestionNode(): IQTreeNode {
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
              },
              {
                data: selectTeamsAppManifestQuestion(true),
                children: [
                  {
                    condition: (inputs: Inputs) => confirmCondition(inputs, true),
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

function selectTeamsAppValidationMethodQuestion(): SingleSelectQuestion {
  return {
    name: QuestionNames.ValidateMethod,
    title: getLocalizedString("core.selectValidateMethodQuestion.validate.selectTitle"),
    staticOptions: [TeamsAppValidationOptions.schema(), TeamsAppValidationOptions.package()],
    type: "singleSelect",
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

function selectM365HostQuestion(): SingleSelectQuestion {
  return {
    name: QuestionNames.M365Host,
    title: getLocalizedString("core.M365HostQuestion.title"),
    type: "singleSelect",
    staticOptions: [Hub.teams, Hub.outlook, Hub.office],
    placeholder: getLocalizedString("core.M365HostQuestion.placeholder"),
  };
}

function previewWithTeamsAppManifestNode(): IQTreeNode {
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
    staticOptions: ["dev", "local"],
    dynamicOptions: async (inputs: Inputs) => {
      const res = await envUtil.listEnv(inputs.projectPath!, remoteOnly);
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
    title: getLocalizedString("core.selectAadManifestQuestion.title"),
    type: "singleFile",
    default: (inputs: Inputs): string | undefined => {
      const manifestPath: string = path.join(inputs.projectPath!, "aad.manifest.json");
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
  };
}

export async function envQuestionCondition(inputs: Inputs): Promise<boolean> {
  const appType = inputs[CollaborationConstants.AppType] as string[];
  const requireAad = appType.includes(CollaborationConstants.AadAppQuestionId);
  const requireTeams = appType.includes(CollaborationConstants.TeamsAppQuestionId);
  const aadManifestPath = inputs[QuestionNames.AadAppManifestFilePath];
  const teamsManifestPath = inputs[QuestionNames.TeamsAppManifestFilePath];

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

function listCollaboratorQuestionNode(): IQTreeNode {
  const selectTeamsAppNode = selectTeamsAppManifestQuestionNode();
  selectTeamsAppNode.condition = { contains: CollaborationConstants.TeamsAppQuestionId };
  const selectAadAppNode = selectAadAppManifestQuestionNode();
  selectAadAppNode.condition = { contains: CollaborationConstants.AadAppQuestionId };
  return {
    data: { type: "group" },
    children: [
      {
        condition: (inputs: Inputs) => DynamicPlatforms.includes(inputs.platform),
        data: selectAppTypeQuestion(),
        children: [
          selectTeamsAppNode,
          selectAadAppNode,
          {
            condition: envQuestionCondition,
            data: selectTargetEnvQuestion(QuestionNames.Env, false, false, ""),
          },
        ],
      },
    ],
  };
}
