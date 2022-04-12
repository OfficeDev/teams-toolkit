// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Platform, ProjectSettings, v2 } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import { cloneDeep } from "lodash";
import * as os from "os";
import * as path from "path";
import "reflect-metadata";
import { createV2Context } from "../../../common";
import { setTools } from "../../globalVars";
import { getProjectSettingsPath } from "../../middleware/projectSettingsLoader";
import "../fx";
import { Action, ContextV3 } from "../interface";
import { MockTools } from "../utils";
import { executeAction, getAction, planAction } from "../workflow";
import readlineSync from "readline-sync";

const appName = "appv3";
const projectPath = path.join(os.homedir(), "TeamsApps", appName);
const debugMode = false;

async function runAction(action: Action, context: any, inputs: any): Promise<void> {
  await planAction(action, context, cloneDeep(inputs));
  if (debugMode) {
    await executeAction(action, context, inputs);
  } else {
    const confirm = readlineSync.question("confirm to execute (y|n):");
    if (confirm !== "n") {
      await executeAction(action, context, inputs);
    }
  }
  await fs.writeFile(
    path.join(inputs.projectPath, ".fx/inputs.json"),
    JSON.stringify(inputs, undefined, 4)
  );
  await fs.writeFile(
    getProjectSettingsPath(inputs.projectPath),
    JSON.stringify(context.projectSetting, undefined, 4)
  );
}

async function init() {
  const context = createV2Context({} as ProjectSettings) as ContextV3;
  const inputs: v2.InputsWithProjectPath = {
    projectPath: projectPath,
    platform: Platform.VSCode,
    fx: {
      "app-name": "myapp123",
    },
  };
  const action = await getAction("fx.init", context, inputs);
  if (action) {
    await runAction(action, context, inputs);
  }
}

async function addBot() {
  const inputs: v2.InputsWithProjectPath = {
    projectPath: projectPath,
    platform: Platform.VSCode,
    "teams-bot": {
      hostingResource: "azure-web-app",
      folder: "bot",
      scenario: "default",
      language: "typescript",
    },
  };
  const projectSettings = await fs.readJson(getProjectSettingsPath(inputs.projectPath));
  const context = createV2Context(projectSettings) as ContextV3;
  const action = await getAction("fx.addBot", context, inputs);
  if (action) {
    await runAction(action, context, inputs);
  }
  await fs.writeFile(
    getProjectSettingsPath(inputs.projectPath),
    JSON.stringify(context.projectSetting, undefined, 4)
  );
}

async function provision() {
  const inputs: v2.InputsWithProjectPath = {
    projectPath: path.join(os.tmpdir(), "myapp"),
    platform: Platform.VSCode,
  };
  const projectSettings = await fs.readJson(getProjectSettingsPath(inputs.projectPath));
  const context = createV2Context(projectSettings) as ContextV3;
  const action = await getAction("fx.provision", context, inputs);
  if (action) {
    await runAction(action, context, inputs);
  }
  console.log("inputs:");
  console.log(inputs);
}
async function deploy() {
  const inputs: v2.InputsWithProjectPath = {
    projectPath: projectPath,
    platform: Platform.VSCode,
  };
  const projectSettings = await fs.readJson(getProjectSettingsPath(inputs.projectPath));
  const context = createV2Context(projectSettings) as ContextV3;
  const action = await getAction("fx.deploy", context, inputs);
  if (action) {
    await runAction(action, context, inputs);
  }
  console.log("inputs:");
  console.log(inputs);
}

setTools(new MockTools());
// addBot();

const command = readlineSync.question("Command(init|addBot|provision|deploy): ");
if (command === "init") {
  init();
} else if (command === "addBot") {
  addBot();
} else if (command === "provision") {
  provision();
} else if (command === "deploy") {
  deploy();
}
