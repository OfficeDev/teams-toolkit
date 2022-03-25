// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Platform, ProjectSettings, v2 } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import "reflect-metadata";
import { createV2Context } from "../../common";
import { setTools } from "../globalVars";
import "./aad";
import "./azureBot";
import "./azureFunction";
import "./azureSql";
import "./azureStorage";
import "./azureWebApp";
import "./botScaffold";
import { executeAction, getAction, planAction, resolveAction } from "./core";
import { Action, ProjectConfig } from "./interface";
import "./tabScaffold";
import "./teamsBot";
import "./teamsManifest";
import "./teamsTab";
import { MockTools } from "./utils";

async function provision() {
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
    await fs.writeFile("provision.json", JSON.stringify(action, undefined, 4));
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
      activeResourcePlugins: ["azure-function", "azure-web-app"],
    },
  };
  const context = createV2Context(projectSetting);
  const inputs: v2.InputsWithProjectPath & { resource: string } = {
    projectPath: "",
    platform: Platform.VSCode,
    resource: "azure-sql",
  };
  const action = await getAction("fx.add", context, inputs);
  if (action) {
    const resolved = await resolveAction(action, context, inputs);
    await fs.writeFile("addSql.json", JSON.stringify(resolved, undefined, 4));
    await planAction(context, inputs, action);
    inputs.step = 1;
    await executeAction(context, inputs, action);
  }
  console.log("inputs:");
  console.log(inputs);
  console.log("projectSetting:");
  console.log(projectSetting);
}

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
    await planAction(context, inputs, action);
    inputs.step = 1;
    await executeAction(context, inputs, action);
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
    await planAction(context, inputs, action);
    inputs.step = 1;
    await executeAction(context, inputs, action);
  }
  console.log("inputs:");
  console.log(inputs);
  console.log("projectSetting:");
  console.log(projectSetting);
}

async function generateDeployScript() {
  setTools(new MockTools());
  const projectSetting: ProjectConfig = {
    projectId: "12",
    appName: "huajie0316",
    solutionSettings: {
      name: "fx",
      activeResourcePlugins: ["azure-storage", "azure-web-app", "azure-bot"],
    },
    tab: {
      language: "typescript",
      hostingResource: "azure-storage",
    },
    bot: {
      language: "csharp",
      hostingResource: "azure-web-app",
    },
  };
  const context = createV2Context(projectSetting);
  const inputs: v2.InputsWithProjectPath = {
    projectPath: path.join(os.tmpdir(), "myapp"),
    platform: Platform.VSCode,
  };
  const action = await getAction("fx.deploy", context, inputs);
  if (action) {
    const resolved = await resolveAction(action, context, inputs);
    await fs.writeFile("deploy.json", JSON.stringify(resolved, undefined, 4));
  }
}

async function deployFromScript() {
  setTools(new MockTools());
  const projectSetting: ProjectConfig = {
    projectId: "12",
    appName: "huajie0316",
    solutionSettings: {
      name: "fx",
      activeResourcePlugins: ["azure-storage", "azure-web-app", "azure-bot"],
    },
    tab: {
      language: "typescript",
      hostingResource: "azure-storage",
    },
    bot: {
      language: "csharp",
      hostingResource: "azure-web-app",
    },
  };
  const context = createV2Context(projectSetting);
  const inputs: v2.InputsWithProjectPath = {
    projectPath: path.join(os.tmpdir(), "myapp"),
    platform: Platform.VSCode,
  };
  const action = (await fs.readJson("deploy.json")) as Action;
  if (action) {
    await planAction(context, inputs, action);
    inputs.step = 1;
    await executeAction(context, inputs, action);
  }
}

const arg = process.argv[2];

if (arg === "tab") {
  addTeamsTab();
} else if (arg === "bot") {
  addTeamsBot();
} else if (arg === "sql") {
  addSql();
} else if (arg === "deploy-gen") {
  generateDeployScript();
} else if (arg === "deploy") {
  deployFromScript();
}
