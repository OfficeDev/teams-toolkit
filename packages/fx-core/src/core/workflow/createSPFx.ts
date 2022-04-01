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
import { cloneDeep } from "lodash";

async function createSPFx() {
  setTools(new MockTools());
  const context = createV2Context({} as ProjectSettings);
  const inputs: v2.InputsWithProjectPath = {
    projectPath: path.join(os.tmpdir(), "myapp"),
    platform: Platform.VSCode,
    capabilities: [TabSPFxItem.id],
    "teams-tab": {
      hostingResource: "spfx",
      framework: "react",
    },
    "programming-language": "typescript",
  };
  const action = await getAction("fx.create", context, inputs);
  if (action) {
    const resolved = await resolveAction(action, context, cloneDeep(inputs));
    fs.writeFileSync("createSPFx.json", JSON.stringify(resolved, undefined, 4));
    await planAction(action, context, cloneDeep(inputs));
    await executeAction(action, context, inputs);
  }
  console.log("inputs:");
  console.log(inputs);
  console.log("projectSetting:");
  console.log(context.projectSetting);
}

createSPFx();
