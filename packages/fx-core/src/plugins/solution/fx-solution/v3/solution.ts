// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { v3 } from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { addFeature, getQuestionsForAddFeature } from "./addFeature";
import { TeamsFxAzureSolutionNameV3 } from "./constants";
import { deploy, getQuestionsForDeploy } from "./deploy";
import { getQuestionsForInit, init } from "./init";
import { getQuestionsForProvision, provisionResources } from "./provision";
import { getQuestionsForPublish, publishApplication } from "./publish";
import { executeUserTask, getQuestionsForUserTask } from "./userTask";

@Service(TeamsFxAzureSolutionNameV3)
export class TeamsFxAzureSolution implements v3.ISolution {
  name = TeamsFxAzureSolutionNameV3;
  getQuestionsForInit = getQuestionsForInit;
  init = init;
  getQuestionsForAddFeature = getQuestionsForAddFeature;
  addFeature = addFeature;
  getQuestionsForProvision = getQuestionsForProvision;
  provisionResources = provisionResources.bind(this);
  getQuestionsForDeploy = getQuestionsForDeploy;
  deploy = deploy;
  getQuestionsForPublish = getQuestionsForPublish;
  publishApplication = publishApplication;
  getQuestionsForUserTask = getQuestionsForUserTask;
  executeUserTask = executeUserTask;
}
