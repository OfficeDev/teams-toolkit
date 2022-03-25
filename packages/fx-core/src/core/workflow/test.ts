// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Platform, ProjectSettings, v2 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { createV2Context } from "../../common";
import { setTools } from "../globalVars";
import "./aad";
import "./azureBot";
import "./azureFunction";
import "./azureStorage";
import "./azureWebApp";
import "./azureSql";
import { executeAction, getAction, planAction } from "./core";
import "./teamsBot";
import "./teamsManifest";
import "./teamsTab";
import "./botScaffold";
import "./tabScaffold";
import { MockTools } from "./utils";

async function testProvision() {
  setTools(new MockTools());
  const projectSetting: ProjectSettings = {
    projectId: "12",
    appName: "huajie0316",
    solutionSettings: {
      name: "fx",
      activeResourcePlugins: ["aad", "azure-storage", "azure-web-app", "azure-bot"],
    },
  };
  const context = createV2Context(projectSetting);
  const inputs: v2.InputsWithProjectPath = {
    projectPath: "",
    platform: Platform.VSCode,
  };
  const action = await getAction("fx.provision", context, inputs);
  if (action) {
    console.log(JSON.stringify(action));
    await planAction(context, inputs, action);
    await executeAction(context, inputs, action);
  }
  console.log("inputs:");
  console.log(inputs);
  console.log("projectSetting:");
  console.log(projectSetting);
}

async function addBot() {
  setTools(new MockTools());
  const projectSetting: ProjectSettings = {
    projectId: "12",
    appName: "huajie0316",
    solutionSettings: {
      name: "fx",
      activeResourcePlugins: [],
    },
  };
  const context = createV2Context(projectSetting);
  const inputs: v2.InputsWithProjectPath & { resources: string[] } = {
    projectPath: "",
    platform: Platform.VSCode,
    resources: ["teams-bot"],
    language: "typescript",
    scenario: "notification",
    hostingResource: "azure-web-app",
  };
  const action = await getAction("fx.add", context, inputs);
  if (action) {
    console.log(JSON.stringify(action));
    // const resolved = await resolveAction(context, inputs, action);
    // console.log(JSON.stringify(resolved));
    await planAction(context, inputs, action);
    await executeAction(context, inputs, action);
  }
  console.log("inputs:");
  console.log(inputs);
  console.log("projectSetting:");
  console.log(projectSetting);
}

/**
 * azure-sql.generateBicep will trigger azure-function.updateBicep and azure-web-app.updateBicep if they exists in current project settings
 */
async function addSql() {
  setTools(new MockTools());
  const projectSetting: ProjectSettings = {
    projectId: "12",
    appName: "huajie0316",
    solutionSettings: {
      name: "fx",
      activeResourcePlugins: ["azure-function"],
    },
  };
  const context = createV2Context(projectSetting);
  const inputs: v2.InputsWithProjectPath & { resources: string[] } = {
    projectPath: "",
    platform: Platform.VSCode,
    resources: ["azure-sql"],
  };
  const action = await getAction("fx.add", context, inputs);
  if (action) {
    console.log(JSON.stringify(action));
    // const resolved = await resolveAction(context, inputs, action);
    // console.log(JSON.stringify(resolved));
    await planAction(context, inputs, action);
    await executeAction(context, inputs, action);
  }
  console.log("inputs:");
  console.log(inputs);
  console.log("projectSetting:");
  console.log(projectSetting);
}

addBot();
