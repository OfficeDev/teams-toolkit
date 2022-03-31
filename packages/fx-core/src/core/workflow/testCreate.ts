// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Platform, ProjectSettings, v2 } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import "reflect-metadata";
import { createV2Context } from "../../common";
import { NotificationOptionItem, TabOptionItem } from "../../plugins/solution/fx-solution/question";
import { setTools } from "../globalVars";
import "./aad";
import "./azureBot";
import "./azureFunction";
import "./azureSql";
import "./azureStorage";
import "./azureWebApp";
import "./botScaffold";
import "./core";
import "./spfx";
import "./tabScaffold";
import "./teamsBot";
import "./teamsManifest";
import "./teamsTab";
import { MockTools } from "./utils";
import { executeAction, getAction, planAction, resolveAction } from "./workflow";

async function genCreateTab() {
  setTools(new MockTools());
  const context = createV2Context({} as ProjectSettings);
  const inputs: v2.InputsWithProjectPath = {
    projectPath: path.join(os.tmpdir(), "myapp"),
    platform: Platform.VSCode,
    language: "typescript",
    capabilities: [TabOptionItem.id],
    "teams-tab": {
      hostingResource: "azure-storage",
      framework: "react",
    },
    "programming-language": "typescript",
  };
  const action = await getAction("fx.create", context, inputs);
  if (action) {
    const resolved = await resolveAction(action, context, inputs);
    await fs.writeFile("createTab.json", JSON.stringify(resolved, undefined, 4));
  }
}

async function execCreateTab() {
  setTools(new MockTools());
  const context = createV2Context({} as ProjectSettings);
  const inputs: v2.InputsWithProjectPath = {
    projectPath: path.join(os.tmpdir(), "myapp"),
    platform: Platform.VSCode,
    language: "typescript",
    capabilities: [TabOptionItem.id],
    "teams-tab": {
      hostingResource: "azure-storage",
      framework: "react",
    },
    "programming-language": "typescript",
  };
  const action = await getAction("fx.create", context, inputs);
  if (action) {
    await planAction(action, context, inputs);
    inputs.step = 1;
    await executeAction(action, context, inputs);
  }
}
async function genCreateTabBot() {
  setTools(new MockTools());
  const context = createV2Context({} as ProjectSettings);
  const inputs: v2.InputsWithProjectPath = {
    projectPath: path.join(os.tmpdir(), "myapp"),
    platform: Platform.VSCode,
    language: "typescript",
    capabilities: [TabOptionItem.id, NotificationOptionItem.id],
    "teams-tab": {
      hostingResource: "azure-storage",
      framework: "react",
    },
    "teams-bot": {
      hostingResource: "azure-web-app",
    },
    "programming-language": "typescript",
  };
  const action = await getAction("fx.create", context, inputs);
  if (action) {
    fs.writeFileSync("createTabBot.json", JSON.stringify(action, undefined, 4));
  }
}

async function execCreateTabBot() {
  setTools(new MockTools());
  const context = createV2Context({} as ProjectSettings);
  const inputs: v2.InputsWithProjectPath = {
    projectPath: path.join(os.tmpdir(), "myapp"),
    platform: Platform.VSCode,
    language: "typescript",
    capabilities: [TabOptionItem.id, NotificationOptionItem.id],
    "teams-tab": {
      hostingResource: "azure-storage",
      framework: "react",
    },
    "teams-bot": {
      hostingResource: "azure-web-app",
    },
    "programming-language": "typescript",
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

// genCreateTab();
// execCreateTab();

genCreateTabBot();
execCreateTabBot();
