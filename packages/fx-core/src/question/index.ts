import { FxError, IQTreeNode, Result, ok } from "@microsoft/teamsfx-api";
import { createProjectCliHelpNode, createProjectQuestionNode } from "./create";
import {
  addWebPartQuestionNode,
  deployAadManifestQuestionNode,
  grantPermissionQuestionNode,
  listCollaboratorQuestionNode,
  previewWithTeamsAppManifestQuestionNode,
  selectTeamsAppManifestQuestionNode,
  selectTeamsAppPackageQuestionNode,
  selectTeamsAppValidationMethodQuestionNode,
} from "./other";

export * from "./questionNames";

class QuestionNodes {
  createProject: () => IQTreeNode | undefined = createProjectQuestionNode;
  createProjectCliHelp: () => IQTreeNode | undefined = createProjectCliHelpNode;
  addWebpart: () => IQTreeNode | undefined = addWebPartQuestionNode;
  selectTeamsAppManifest: () => IQTreeNode | undefined = selectTeamsAppManifestQuestionNode;
  selectTeamsAppValidationMethod: () => IQTreeNode | undefined =
    selectTeamsAppValidationMethodQuestionNode;
  selectTeamsAppPackage: () => IQTreeNode | undefined = selectTeamsAppPackageQuestionNode;
  previewWithTeamsAppManifest: () => IQTreeNode | undefined =
    previewWithTeamsAppManifestQuestionNode;
  listCollaborator: () => IQTreeNode | undefined = listCollaboratorQuestionNode;
  grantPermission: () => IQTreeNode | undefined = grantPermissionQuestionNode;
  deployAadManifest: () => IQTreeNode | undefined = deployAadManifestQuestionNode;
}

export const questionNodes = new QuestionNodes();

class Questions {
  createProject(): Result<IQTreeNode | undefined, FxError> {
    return ok(questionNodes.createProject());
  }

  createProjectCliHelp(): Result<IQTreeNode | undefined, FxError> {
    return ok(questionNodes.createProjectCliHelp());
  }

  addWebpart(): Result<IQTreeNode | undefined, FxError> {
    return ok(questionNodes.addWebpart());
  }

  selectTeamsAppManifest(): Result<IQTreeNode | undefined, FxError> {
    return ok(questionNodes.selectTeamsAppManifest());
  }

  selectTeamsAppValidationMethod(): Result<IQTreeNode | undefined, FxError> {
    return ok(questionNodes.selectTeamsAppValidationMethod());
  }

  selectTeamsAppPackage(): Result<IQTreeNode | undefined, FxError> {
    return ok(questionNodes.selectTeamsAppPackage());
  }

  previewWithTeamsAppManifest(): Result<IQTreeNode | undefined, FxError> {
    return ok(questionNodes.previewWithTeamsAppManifest());
  }

  listCollaborator(): Result<IQTreeNode | undefined, FxError> {
    return ok(questionNodes.listCollaborator());
  }

  grantPermission(): Result<IQTreeNode | undefined, FxError> {
    return ok(questionNodes.grantPermission());
  }

  deployAadManifest(): Result<IQTreeNode | undefined, FxError> {
    return ok(questionNodes.deployAadManifest());
  }
}

export const questions = new Questions();
