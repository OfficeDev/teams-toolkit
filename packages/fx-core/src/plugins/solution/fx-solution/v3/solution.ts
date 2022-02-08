// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { v3 } from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { addFeature, getQuestionsForAddFeature } from "./addFeature";
import { TeamsFxAzureSolutionNameV3 } from "./constants";
import { deploy, getQuestionsForDeploy } from "./deploy";
import { getQuestionsForProvision, provisionResources } from "./provision";
import { getQuestionsForPublish, publishApplication } from "./publish";
import { executeUserTask, getQuestionsForUserTask } from "./userTask";

@Service(TeamsFxAzureSolutionNameV3)
export class TeamsFxAzureSolution implements v3.ISolution {
  name = TeamsFxAzureSolutionNameV3;

  getQuestionsForAddFeature = getQuestionsForAddFeature;
  addFeature = addFeature;

  getQuestionsForProvision = getQuestionsForProvision;
  provisionResources = provisionResources;

  getQuestionsForDeploy = getQuestionsForDeploy;
  deploy = deploy;

  getQuestionsForPublish = getQuestionsForPublish;
  publishApplication = publishApplication;

  getQuestionsForUserTask = getQuestionsForUserTask;
  executeUserTask = executeUserTask;
}
