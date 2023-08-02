// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IQTreeNode } from "@microsoft/teamsfx-api";
import {
  createProjectCliHelpNode,
  createProjectQuestionNode,
  createSampleProjectQuestionNode,
} from "./create";
import {
  addWebPartQuestionNode,
  copilotPluginAddAPIQuestionNode,
  createNewEnvQuestionNode,
  deployAadManifestQuestionNode,
  grantPermissionQuestionNode,
  listCollaboratorQuestionNode,
  previewWithTeamsAppManifestQuestionNode,
  selectTeamsAppManifestQuestionNode,
  selectTeamsAppPackageQuestionNode,
  selectTeamsAppValidationMethodQuestionNode,
  validateTeamsAppQuestionNode,
} from "./other";

export * from "./create";
export * from "./questionNames";

export * from "./inputs";
export * from "./options";

class QuestionNodes {
  createProject(): IQTreeNode {
    return createProjectQuestionNode();
  }
  createSampleProject(): IQTreeNode {
    return createSampleProjectQuestionNode();
  }
  createProjectCliHelp(): IQTreeNode {
    return createProjectCliHelpNode();
  }
  addWebpart(): IQTreeNode {
    return addWebPartQuestionNode();
  }
  selectTeamsAppManifest(): IQTreeNode {
    return selectTeamsAppManifestQuestionNode();
  }
  validateTeamsApp(): IQTreeNode {
    return validateTeamsAppQuestionNode();
  }
  selectTeamsAppValidationMethod(): IQTreeNode {
    return selectTeamsAppValidationMethodQuestionNode();
  }
  selectTeamsAppPackage(): IQTreeNode {
    return selectTeamsAppPackageQuestionNode();
  }
  previewWithTeamsAppManifest(): IQTreeNode {
    return previewWithTeamsAppManifestQuestionNode();
  }
  listCollaborator(): IQTreeNode {
    return listCollaboratorQuestionNode();
  }
  grantPermission(): IQTreeNode {
    return grantPermissionQuestionNode();
  }
  deployAadManifest(): IQTreeNode {
    return deployAadManifestQuestionNode();
  }
  createNewEnv(): IQTreeNode {
    return createNewEnvQuestionNode();
  }
  copilotPluginAddAPI(): IQTreeNode {
    return copilotPluginAddAPIQuestionNode();
  }
}

export const questionNodes = new QuestionNodes();
