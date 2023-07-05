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

export * from "./create";
export * from "./questionNames";

class Questions {
  createProject(): Result<IQTreeNode | undefined, FxError> {
    return ok(createProjectQuestionNode());
  }

  createProjectCliHelp(): Result<IQTreeNode | undefined, FxError> {
    return ok(createProjectCliHelpNode());
  }

  addWebpart(): Result<IQTreeNode | undefined, FxError> {
    return ok(addWebPartQuestionNode());
  }

  selectTeamsAppManifest(): Result<IQTreeNode | undefined, FxError> {
    return ok(selectTeamsAppManifestQuestionNode());
  }

  selectTeamsAppValidationMethod(): Result<IQTreeNode | undefined, FxError> {
    return ok(selectTeamsAppValidationMethodQuestionNode());
  }

  selectTeamsAppPackage(): Result<IQTreeNode | undefined, FxError> {
    return ok(selectTeamsAppPackageQuestionNode());
  }

  previewWithTeamsAppManifest(): Result<IQTreeNode | undefined, FxError> {
    return ok(previewWithTeamsAppManifestQuestionNode());
  }

  listCollaborator(): Result<IQTreeNode | undefined, FxError> {
    return ok(listCollaboratorQuestionNode());
  }

  grantPermission(): Result<IQTreeNode | undefined, FxError> {
    return ok(grantPermissionQuestionNode());
  }

  deployAadManifest(): Result<IQTreeNode | undefined, FxError> {
    return ok(deployAadManifestQuestionNode());
  }
}

export const questions = new Questions();
