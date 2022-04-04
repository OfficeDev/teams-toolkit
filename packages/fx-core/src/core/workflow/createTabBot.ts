// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Platform, ProjectSettings, v2 } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import { cloneDeep } from "lodash";
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

async function createTabBot() {
  setTools(new MockTools());
  const context = createV2Context({} as ProjectSettings) as v2.Context;
  const inputs: v2.InputsWithProjectPath = {
    projectPath: path.join(os.tmpdir(), "myapp"),
    platform: Platform.VSCode,
    fx: {
      resources: [
        {
          name: "teams-tab",
          hostingResource: "azure-storage",
          framework: "react",
          folder: "tab",
        },
        {
          name: "teams-bot",
          hostingResource: "azure-web-app",
          folder: "bot",
          scenarios: ["default"],
        },
        {
          name: "aad",
        },
      ],
    },
    "programming-language": "typescript",
  };
  const action = await getAction("fx.create", context, inputs);
  if (action) {
    const resolved = await resolveAction(action, context, cloneDeep(inputs));
    fs.writeFileSync("createTabBot.json", JSON.stringify(resolved, undefined, 4));
    await planAction(action, context, cloneDeep(inputs));
    await executeAction(action, context, inputs);
  }
  console.log("inputs:");
  console.log(inputs);
  console.log("projectSetting:");
  console.log(JSON.stringify(context.projectSetting, undefined, 4));
}

createTabBot();
