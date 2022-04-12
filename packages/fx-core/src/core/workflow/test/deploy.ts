// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Platform, v2 } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import { cloneDeep } from "lodash";
import * as os from "os";
import * as path from "path";
import "reflect-metadata";
import { createV2Context } from "../../../common";
import { setTools } from "../../globalVars";
import "../fx";
import { ProjectSettingsV3 } from "../interface";
import { MockTools } from "../utils";
import { executeAction, getAction, planAction, resolveAction } from "../workflow";

async function deploy() {
  setTools(new MockTools());
  const projectSetting: ProjectSettingsV3 = {
    projectId: "123",
    appName: "test",
    solutionSettings: { name: "fx", activeResourcePlugins: [] },
    programmingLanguage: "typescript",
    components: [
      {
        name: "teams-tab",
        hostingResource: "azure-storage",
        framework: "react",
        folder: "myApp",
      },
      {
        name: "tab-scaffold",
        build: true,
        deployType: "zip",
        folder: "myApp",
        language: "typescript",
        framework: "react",
        hostingResource: "azure-storage",
      },
      { name: "azure-storage", provision: true },
      {
        name: "teams-bot",
        scenarios: ["default"],
        folder: "bot",
        hostingResource: "azure-web-app",
      },
      {
        name: "bot-scaffold",
        build: true,
        deployType: "zip",
        folder: "bot",
        language: "typescript",
        scenarios: ["default"],
        hostingResource: "azure-web-app",
      },
      { name: "azure-web-app", provision: true },
    ],
  };
  const context = createV2Context(projectSetting);
  const inputs: v2.InputsWithProjectPath = {
    projectPath: path.join(os.tmpdir(), "myapp"),
    platform: Platform.VSCode,
  };
  const action = await getAction("fx.deploy", context, inputs);
  if (action) {
    const resolved = await resolveAction(action, context, cloneDeep(inputs));
    fs.writeFileSync("deploy.json", JSON.stringify(resolved, undefined, 4));
    await planAction(action, context, cloneDeep(inputs));
    await executeAction(action, context, inputs);
  }
  console.log("inputs:");
  console.log(inputs);
  console.log("projectSetting:");
  console.log(context.projectSetting);
}

async function runDeployJson() {
  setTools(new MockTools());
  const projectSetting: ProjectSettingsV3 = {
    projectId: "123",
    appName: "test",
    solutionSettings: { name: "fx", activeResourcePlugins: [] },
    programmingLanguage: "typescript",
    components: [
      {
        name: "teams-tab",
        hostingResource: "azure-storage",
        framework: "react",
        folder: "myApp",
      },
      {
        name: "tab-scaffold",
        build: true,
        deployType: "zip",
        folder: "myApp",
        language: "typescript",
        framework: "react",
        hostingResource: "azure-storage",
      },
      { name: "azure-storage", provision: true },
      {
        name: "teams-bot",
        scenarios: ["default"],
        folder: "bot",
        hostingResource: "azure-web-app",
      },
      {
        name: "bot-scaffold",
        build: true,
        deployType: "zip",
        folder: "bot",
        language: "typescript",
        scenarios: ["default"],
        hostingResource: "azure-web-app",
      },
      { name: "azure-web-app", provision: true },
    ],
  };
  const context = createV2Context(projectSetting);
  const inputs: v2.InputsWithProjectPath = {
    projectPath: path.join(os.tmpdir(), "myapp"),
    platform: Platform.VSCode,
  };
  const action = fs.readJSONSync("deploy.json");
  if (action) {
    await planAction(action, context, cloneDeep(inputs));
    await executeAction(action, context, inputs);
  }
  console.log("inputs:");
  console.log(inputs);
  console.log("projectSetting:");
  console.log(context.projectSetting);
}

// deploy();
runDeployJson();
