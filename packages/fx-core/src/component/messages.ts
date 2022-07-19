// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Effect } from "@microsoft/teamsfx-api";
import { ProgressBarConstants } from "../plugins/resource/bot/constants";
import {
  DeployProgress,
  PostProvisionProgress,
  ScaffoldProgress,
} from "../plugins/resource/frontend/resources/steps";

export class ProgressTitles {
  static readonly scaffoldTab = ScaffoldProgress.title;
  static readonly scaffoldBot = ProgressBarConstants.SCAFFOLD_TITLE;
  static readonly scaffoldApi = "Scaffolding Api";
  static readonly buildingTab = "Building Tab";
  static readonly buildingBot = "Building Bot";
  static readonly buildingApi = "Building Api";
  static readonly provisionBot = "Provision Azure Bot Service";
  static readonly configureStorage = PostProvisionProgress.title;
  // Deploying Azure Functions [Bot]
  static readonly deploying = (component: string, scenario?: string): string =>
    `Deploying ${component}` + (scenario ? `[${scenario}]` : "");
  static readonly deployingStorage = DeployProgress.title;
}

export class ProgressMessages {
  static readonly scaffoldTab = ScaffoldProgress.steps.Scaffold;
  static readonly scaffoldBot = ProgressBarConstants.SCAFFOLD_STEP_FETCH_ZIP;
  static readonly scaffoldApi = "Scaffolding Function Api project.";
  static readonly buildingTab = DeployProgress.steps.Build;
  static readonly buildingBot = ProgressBarConstants.DEPLOY_STEP_NPM_INSTALL;
  static readonly buildingApi = "Building Function Api.";
  static readonly packingCode = ProgressBarConstants.DEPLOY_STEP_ZIP_FOLDER;
  static readonly enableStaticWebsite = PostProvisionProgress.steps.EnableStaticWebsite;
  static readonly provisionBot = ProgressBarConstants.PROVISION_STEP_BOT_REG;
}

export class Plans {
  static readonly scaffold = (scenario: string, folder: string): Effect =>
    `scaffold ${scenario} source code in folder: ${folder}`;
  static readonly buildProject = (folder: string): Effect => `build project: ${folder}`;
  static readonly deploy = (component: string, folder: string): Effect => ({
    type: "service",
    name: "azure",
    remarks: `deploy ${component} in folder: ${folder}`,
  });
  static readonly enableStaticWebsite = (): Effect => ({
    type: "service",
    name: "azure",
    remarks: "configure azure storage (enable static web site)",
  });
  static readonly createAADforBot = (): Effect => ({
    type: "service",
    name: "graph.microsoft.com",
    remarks: "create AAD app for bot service (botId, botPassword)",
  });
  static readonly registerBot = (): Effect => ({
    type: "service",
    name: "teams.microsoft.com",
    remarks: "create bot registration",
  });
  static readonly updateBotEndpoint = (): Effect => ({
    type: "service",
    name: "graph.microsoft.com",
    remarks: "update message endpoint in AppStudio",
  });
}
