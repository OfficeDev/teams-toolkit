// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  FxError,
  Inputs,
  ok,
  QTreeNode,
  Result,
  SingleSelectQuestion,
  TextInputQuestion,
} from "@microsoft/teamsfx-api";
import { getLocalizedString } from "../common/localizeUtils";
import {
  selectM365HostQuestion,
  selectTeamsAppManifestQuestion,
  selectTeamsAppPackageQuestion,
} from "../core/question";
import { SPFxImportFolderQuestion, SPFxWebpartNameQuestion } from "../question/create";
import { QuestionNames } from "../question/questionNames";
import { validateAppPackageOption, validateSchemaOption } from "./constants";

export function getUserEmailQuestion(currentUserEmail: string): TextInputQuestion {
  let defaultUserEmail = "";
  if (currentUserEmail && currentUserEmail.indexOf("@") > 0) {
    defaultUserEmail = "[UserName]@" + currentUserEmail.split("@")[1];
  }
  return {
    name: "email",
    type: "text",
    title: getLocalizedString("core.getUserEmailQuestion.title"),
    default: defaultUserEmail,
    validation: {
      validFunc: (input: string, previousInputs?: Inputs): string | undefined => {
        if (!input || input.trim() === "") {
          return getLocalizedString("core.getUserEmailQuestion.validation1");
        }

        input = input.trim();

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

export function SelectEnvQuestion(): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: "env",
    title: getLocalizedString("core.QuestionSelectTargetEnvironment.title"),
    staticOptions: [],
    skipSingleOption: true,
    forgetLastValue: true,
  };
}

export function getQuestionsForAddWebpart(inputs: Inputs): Result<QTreeNode | undefined, FxError> {
  const addWebpart = new QTreeNode({ type: "group" });

  const spfxFolder = new QTreeNode(SPFxImportFolderQuestion(true));
  addWebpart.addChild(spfxFolder);

  const webpartName = new QTreeNode(SPFxWebpartNameQuestion());
  spfxFolder.addChild(webpartName);

  const manifestFile = selectTeamsAppManifestQuestion(inputs);
  webpartName.addChild(manifestFile);

  const localManifestFile = selectTeamsAppManifestQuestion(inputs, true);
  manifestFile.addChild(localManifestFile);

  return ok(addWebpart);
}

export async function getQuestionsForValidateMethod(): Promise<
  Result<QTreeNode | undefined, FxError>
> {
  const group = new QTreeNode({ type: "group" });
  const question: SingleSelectQuestion = {
    name: QuestionNames.ValidateMethod,
    title: getLocalizedString("core.selectValidateMethodQuestion.validate.selectTitle"),
    staticOptions: [validateSchemaOption, validateAppPackageOption],
    type: "singleSelect",
  };
  const node = new QTreeNode(question);
  group.addChild(node);
  return ok(group);
}

export async function getQuestionsForValidateManifest(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const group = new QTreeNode({ type: "group" });
  // Manifest path node
  const teamsAppSelectNode = selectTeamsAppManifestQuestion(inputs);
  group.addChild(teamsAppSelectNode);
  return ok(group);
}

export async function getQuestionsForValidateAppPackage(): Promise<
  Result<QTreeNode | undefined, FxError>
> {
  const group = new QTreeNode({ type: "group" });
  // App package path node
  const teamsAppSelectNode = new QTreeNode(selectTeamsAppPackageQuestion());
  group.addChild(teamsAppSelectNode);
  return ok(group);
}

export async function getQuestionsForCreateAppPackage(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const group = new QTreeNode({ type: "group" });
  // Manifest path node
  const teamsAppSelectNode = selectTeamsAppManifestQuestion(inputs);
  group.addChild(teamsAppSelectNode);
  return ok(group);
}

export async function getQuestionsForUpdateTeamsApp(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const group = new QTreeNode({ type: "group" });
  // Manifest path node
  const teamsAppSelectNode = selectTeamsAppManifestQuestion(inputs);
  group.addChild(teamsAppSelectNode);
  return ok(group);
}

export async function getQuestionsForPreviewWithManifest(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const group = new QTreeNode({ type: "group" });
  group.addChild(selectM365HostQuestion());
  group.addChild(selectTeamsAppManifestQuestion(inputs));
  return ok(group);
}
