// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { v3 } from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { addModule, getQuestionsForAddModule } from "./addModule";
import { addResource, getQuestionsForAddResource } from "./addResource";
import { TeamsFxAzureSolutionNameV3 } from "./constants";
import { deploy, getQuestionsForDeploy } from "./deploy";
import { getQuestionsForInit, init } from "./init";
import { getQuestionsForProvision, provisionResources } from "./provision";
import { getQuestionsForLocalProvision, provisionLocalResources } from "./provisionLocal";
import { getQuestionsForPublish, publishApplication } from "./publish";
import { getQuestionsForScaffold, scaffold } from "./scaffold";
import { executeUserTask, getQuestionsForUserTask } from "./userTask";

@Service(TeamsFxAzureSolutionNameV3)
export class TeamsFxAzureSolution implements v3.ISolution {
  name = TeamsFxAzureSolutionNameV3;
  getQuestionsForInit = getQuestionsForInit;
  init = init;
  getQuestionsForScaffold = getQuestionsForScaffold;
  scaffold = scaffold;
  getQuestionsForAddResource = getQuestionsForAddResource;
  addResource = addResource;
  getQuestionsForAddModule = getQuestionsForAddModule;
  addModule = addModule;
  getQuestionsForProvision = getQuestionsForProvision;
  provisionResources = provisionResources.bind(this);
  getQuestionsForLocalProvision = getQuestionsForLocalProvision;
  provisionLocalResources = provisionLocalResources;
  getQuestionsForDeploy = getQuestionsForDeploy;
  deploy = deploy;
  getQuestionsForPublish = getQuestionsForPublish;
  publishApplication = publishApplication;
  getQuestionsForUserTask = getQuestionsForUserTask;
  executeUserTask = executeUserTask;
}

@Service("fx-solution-spfx")
export class TeamsFxSFPxSolution implements v3.ISolution {
  name = "fx-solution-spfx";
  init = init;
  getQuestionsForScaffold = getQuestionsForScaffold;
  scaffold = scaffold;
  getQuestionsForAddResource = getQuestionsForAddResource;
  addResource = addResource;
  getQuestionsForAddModule = getQuestionsForAddModule;
  addModule = addModule;
  getQuestionsForProvision = getQuestionsForProvision;
  provisionResources = provisionResources;
  getQuestionsForLocalProvision = getQuestionsForLocalProvision;
  provisionLocalResources = provisionLocalResources;
  getQuestionsForDeploy = getQuestionsForDeploy;
  deploy = deploy;
  getQuestionsForPublish = getQuestionsForPublish;
  publishApplication = publishApplication;
  getQuestionsForUserTask = getQuestionsForUserTask;
  executeUserTask = executeUserTask;
}
