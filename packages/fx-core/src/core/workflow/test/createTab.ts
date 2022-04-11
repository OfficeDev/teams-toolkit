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
import "../core";
import { AddComponentsInputs } from "../interface";
import { MockTools } from "../utils";
import { executeAction, getAction, planAction, resolveAction } from "../workflow";

async function createTab() {
  setTools(new MockTools());
  const context = createV2Context({} as ProjectSettings);
  const inputs: AddComponentsInputs = {
    projectPath: path.join(os.tmpdir(), "myapp"),
    platform: Platform.VSCode,
    fx: {
      components: [
        {
          name: "teams-tab",
          hostingResource: "azure-storage",
          framework: "react",
          folder: "myApp",
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
    fs.writeFileSync("createTab.json", JSON.stringify(resolved, undefined, 4));
    await planAction(action, context, cloneDeep(inputs));
    await executeAction(action, context, inputs);
  }
  console.log("inputs:");
  console.log(inputs);
  console.log("projectSetting:");
  console.log(context.projectSetting);
}
createTab();
