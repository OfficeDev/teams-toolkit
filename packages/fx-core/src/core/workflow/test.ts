// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Platform, ProjectSettings, v2 } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import "reflect-metadata";
import { createV2Context } from "../../common";
import { NotificationOptionItem, TabSPFxItem } from "../../plugins/solution/fx-solution/question";
import { setTools } from "../globalVars";
import "./aad";
import "./azureBot";
import "./azureFunction";
import "./azureSql";
import "./azureStorage";
import "./azureWebApp";
import "./botScaffold";
import "./spfx";
import "./tabScaffold";
import "./teamsBot";
import "./teamsManifest";
import "./teamsTab";
import "./core";
import { MockTools } from "./utils";
import { executeAction, getAction, planAction, resolveAction } from "./workflow";

async function addTeamsTab() {
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
  const inputs: v2.InputsWithProjectPath & { resource: string } = {
    projectPath: path.join(os.tmpdir(), "myapp"),
    platform: Platform.VSCode,
    resource: "teams-tab",
    language: "typescript",
    framework: "react",
    hostingResource: "azure-storage",
  };
  const action = await getAction("fx.add", context, inputs);
  if (action) {
    const resolved = await resolveAction(action, context, inputs);
    await fs.writeFile("addTeamsTab.json", JSON.stringify(resolved, undefined, 4));
    await planAction(action, context, inputs);
    inputs.step = 1;
    await executeAction(action, context, inputs);
  }
  console.log("inputs:");
  console.log(inputs);
  console.log("projectSetting:");
  console.log(projectSetting);
}
async function addTeamsBot() {
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
  const inputs: v2.InputsWithProjectPath & { resource: string } = {
    projectPath: path.join(os.tmpdir(), "myapp"),
    platform: Platform.VSCode,
    resource: "teams-bot",
    language: "typescript",
    scenarios: ["notification"],
    hostingResource: "azure-web-app",
  };
  const action = await getAction("fx.add", context, inputs);
  if (action) {
    const resolved = await resolveAction(action, context, inputs);
    await fs.writeFile("addTeamsBot.json", JSON.stringify(resolved, undefined, 4));
    await planAction(action, context, inputs);
    inputs.step = 1;
    await executeAction(action, context, inputs);
  }
  console.log("inputs:");
  console.log(inputs);
  console.log("projectSetting:");
  console.log(projectSetting);
}

async function createNotificationBot() {
  setTools(new MockTools());
  const context = createV2Context({} as ProjectSettings);
  const inputs: v2.InputsWithProjectPath = {
    projectPath: path.join(os.tmpdir(), "myapp"),
    platform: Platform.VSCode,
    language: "typescript",
    capabilities: [NotificationOptionItem.id],
    bot: {
      hostingResource: "azure-function",
    },
  };
  const action = await getAction("fx.create", context, inputs);
  if (action) {
    await planAction(action, context, inputs);
    inputs.step = 1;
    await executeAction(action, context, inputs);
  }
  console.log("inputs:");
  console.log(inputs);
  console.log("projectSetting:");
  console.log(context.projectSetting);
}

async function createSPFx() {
  setTools(new MockTools());
  const context = createV2Context({} as ProjectSettings);
  const inputs: v2.InputsWithProjectPath = {
    projectPath: path.join(os.tmpdir(), "myapp"),
    platform: Platform.VSCode,
    language: "typescript",
    framework: "react",
    capabilities: [TabSPFxItem.id],
  };
  const action = await getAction("fx.create", context, inputs);
  if (action) {
    await planAction(action, context, inputs);
    inputs.step = 1;
    await executeAction(action, context, inputs);
  }
  console.log("inputs:");
  console.log(inputs);
  console.log("projectSetting:");
  console.log(context.projectSetting);
}
