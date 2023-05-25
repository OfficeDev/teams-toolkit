import {
  DynamicPlatforms,
  FxError,
  Inputs,
  MultiSelectQuestion,
  QTreeNode,
  Result,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import { AppStudioScopes } from "../common/tools";
import { TOOLS } from "../core/globalVars";
import {
  CoreQuestionNames,
  getUserEmailQuestion,
  selectAadAppManifestQuestion,
  selectEnvNode,
  selectTeamsAppManifestQuestion,
} from "./core";
import { CollaborationConstants, CollaborationUtil } from "../core/collaborator";
import { getLocalizedString } from "../common/localizeUtils";

export async function getQuestionsForGrantPermission(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const isDynamicQuestion = DynamicPlatforms.includes(inputs.platform);
  if (isDynamicQuestion) {
    const jsonObjectRes = await TOOLS.tokenProvider.m365TokenProvider.getJsonObject({
      scopes: AppStudioScopes,
    });
    if (jsonObjectRes.isErr()) {
      return err(jsonObjectRes.error);
    }
    const jsonObject = jsonObjectRes.value;

    const root = await getCollaborationQuestionNode(inputs);
    root.addChild(new QTreeNode(getUserEmailQuestion((jsonObject as any).upn)));
    return ok(root);
  }
  return ok(undefined);
}

export async function getQuestionsForListCollaborator(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const isDynamicQuestion = DynamicPlatforms.includes(inputs.platform);
  if (isDynamicQuestion) {
    const root = await getCollaborationQuestionNode(inputs);
    return ok(root);
  }
  return ok(undefined);
}

function selectAppTypeQuestion(): MultiSelectQuestion {
  return {
    name: CollaborationConstants.AppType,
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

async function getCollaborationQuestionNode(inputs: Inputs): Promise<QTreeNode> {
  const root = new QTreeNode(selectAppTypeQuestion());

  // Teams app manifest select node
  const teamsAppSelectNode = selectTeamsAppManifestQuestion(inputs);
  teamsAppSelectNode.condition = { contains: CollaborationConstants.TeamsAppQuestionId };
  root.addChild(teamsAppSelectNode);

  // Aad app manifest select node
  const aadAppSelectNode = selectAadAppManifestQuestion(inputs);
  aadAppSelectNode.condition = { contains: CollaborationConstants.AadAppQuestionId };
  root.addChild(aadAppSelectNode);

  // Env select node
  const envNode = await selectEnvNode(inputs);
  if (!envNode) {
    return root;
  }
  envNode.data.name = "env";
  envNode.condition = {
    validFunc: validateEnvQuestion,
  };
  teamsAppSelectNode.addChild(envNode);
  aadAppSelectNode.addChild(envNode);

  return root;
}

export async function validateEnvQuestion(
  input: any,
  inputs?: Inputs
): Promise<string | undefined> {
  if (inputs?.env || inputs?.targetEnvName) {
    return "Env already selected";
  }

  const appType = inputs?.[CollaborationConstants.AppType] as string[];
  const requireAad = appType.includes(CollaborationConstants.AadAppQuestionId);
  const requireTeams = appType.includes(CollaborationConstants.TeamsAppQuestionId);
  const aadManifestPath = inputs?.[CoreQuestionNames.AadAppManifestFilePath];
  const teamsManifestPath = inputs?.[CoreQuestionNames.TeamsAppManifestFilePath];

  // When both is selected, only show the question once at the end
  if ((requireAad && !aadManifestPath) || (requireTeams && !teamsManifestPath)) {
    return "Question not finished";
  }

  // Only show env question when manifest id is referencing value from .env file
  let requireEnv = false;
  if (requireTeams && teamsManifestPath) {
    const teamsAppIdRes = await CollaborationUtil.loadManifestId(teamsManifestPath);
    if (teamsAppIdRes.isOk()) {
      requireEnv = CollaborationUtil.requireEnvQuestion(teamsAppIdRes.value);
      if (requireEnv) {
        return undefined;
      }
    } else {
      return "Invalid manifest";
    }
  }

  if (requireAad && aadManifestPath) {
    const aadAppIdRes = await CollaborationUtil.loadManifestId(aadManifestPath);
    if (aadAppIdRes.isOk()) {
      requireEnv = CollaborationUtil.requireEnvQuestion(aadAppIdRes.value);
      if (requireEnv) {
        return undefined;
      }
    } else {
      return "Invalid manifest";
    }
  }

  return "Env question not required";
}
