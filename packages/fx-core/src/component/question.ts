// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  FolderQuestion,
  FxError,
  Inputs,
  ok,
  QTreeNode,
  Result,
  SingleSelectQuestion,
  TextInputQuestion,
} from "@microsoft/teamsfx-api";
import path from "path";
import { getLocalizedString } from "../common/localizeUtils";
import {
  selectM365HostQuestion,
  selectTeamsAppManifestQuestion,
  selectTeamsAppPackageQuestion,
} from "../core/question";
import { SPFxQuestionNames, validateAppPackageOption, validateSchemaOption } from "./constants";
import {
  frameworkQuestion,
  spfxImportFolderQuestion,
  spfxPackageSelectQuestion,
  spfxSolutionQuestion,
  webpartNameQuestion,
} from "./generator/spfx/utils/questions";
import { QuestionNames } from "../question/questionNames";

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

export function spfxFolderQuestion(): FolderQuestion {
  return {
    type: "folder",
    name: SPFxQuestionNames.SPFxFolder,
    title: getLocalizedString("core.spfxFolder.title"),
    placeholder: getLocalizedString("core.spfxFolder.placeholder"),
    default: (inputs: Inputs) => {
      return path.join(inputs.projectPath!, "src");
    },
  };
}

export function getQuestionsForAddWebpart(inputs: Inputs): Result<QTreeNode | undefined, FxError> {
  const addWebpart = new QTreeNode({ type: "group" });

  const spfxFolder = new QTreeNode(spfxFolderQuestion());
  addWebpart.addChild(spfxFolder);

  const webpartName = new QTreeNode(webpartNameQuestion);
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

export function getSPFxScaffoldQuestion(): QTreeNode {
  const spfx_frontend_host = new QTreeNode({
    type: "group",
  });

  const spfx_solution = new QTreeNode(spfxSolutionQuestion);
  const spfx_solution_new = new QTreeNode({ type: "group" });
  spfx_solution_new.condition = { equals: "new" };
  const spfx_solution_import = new QTreeNode({ type: "group" });
  spfx_solution_import.condition = { equals: "import" };
  spfx_solution.addChild(spfx_solution_new);
  spfx_solution.addChild(spfx_solution_import);
  spfx_frontend_host.addChild(spfx_solution);

  const spfx_select_package_question = new QTreeNode(spfxPackageSelectQuestion);
  const spfx_framework_type = new QTreeNode(frameworkQuestion);
  const spfx_webpart_name = new QTreeNode(webpartNameQuestion);

  spfx_solution_new.addChild(spfx_select_package_question);
  spfx_solution_new.addChild(spfx_framework_type);
  spfx_solution_new.addChild(spfx_webpart_name);

  spfx_solution_import.addChild(new QTreeNode(spfxImportFolderQuestion()));

  return spfx_frontend_host;
}
