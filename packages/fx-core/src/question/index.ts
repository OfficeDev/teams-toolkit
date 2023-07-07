import { FxError, IQTreeNode, Result, ok } from "@microsoft/teamsfx-api";
import { createProjectCliHelpNode, createProjectQuestionNode } from "./create";
import {
  addWebPartQuestionNode,
  createNewEnvQuestionNode,
  deployAadManifestQuestionNode,
  grantPermissionQuestionNode,
  listCollaboratorQuestionNode,
  previewWithTeamsAppManifestQuestionNode,
  selectTeamsAppManifestQuestionNode,
  selectTeamsAppPackageQuestionNode,
  selectTeamsAppValidationMethodQuestionNode,
} from "./other";

export * from "./questionNames";
export * from "./create";

class QuestionNodes {
  createProject(): IQTreeNode | undefined {
    return createProjectQuestionNode();
  }
  createProjectCliHelp(): IQTreeNode | undefined {
    return createProjectCliHelpNode();
  }
  addWebpart(): IQTreeNode | undefined {
    return addWebPartQuestionNode();
  }
  selectTeamsAppManifest(): IQTreeNode | undefined {
    return selectTeamsAppManifestQuestionNode();
  }
  selectTeamsAppValidationMethod(): IQTreeNode | undefined {
    return selectTeamsAppValidationMethodQuestionNode();
  }
  selectTeamsAppPackage(): IQTreeNode | undefined {
    return selectTeamsAppPackageQuestionNode();
  }
  previewWithTeamsAppManifest(): IQTreeNode | undefined {
    return previewWithTeamsAppManifestQuestionNode();
  }
  listCollaborator(): IQTreeNode | undefined {
    return listCollaboratorQuestionNode();
  }
  grantPermission(): IQTreeNode | undefined {
    return grantPermissionQuestionNode();
  }
  deployAadManifest(): IQTreeNode | undefined {
    return deployAadManifestQuestionNode();
  }
  createNewEnv(): IQTreeNode | undefined {
    return createNewEnvQuestionNode();
  }
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

  createNewEnv(): Result<IQTreeNode | undefined, FxError> {
    return ok(questionNodes.createNewEnv());
  }
}

export const questions = new Questions();
