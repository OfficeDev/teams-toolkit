// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Platform, v2 } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import "reflect-metadata";
import { createV2Context } from "../../../common";
import { setTools } from "../../globalVars";
import "../fx";
import { ProjectSettingsV3 } from "../interface";
import { MockTools } from "../utils";
import { executeAction, getAction, planAction, resolveAction } from "../workflow";

async function tabAddBot() {
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
    ],
  };
  const context = createV2Context(projectSetting);
  const inputs: v2.InputsWithProjectPath = {
    projectPath: path.join(os.tmpdir(), "myapp"),
    platform: Platform.VSCode,
    fx: {
      resources: [
        {
          name: "teams-bot",
          scenarios: ["default"],
          folder: "bot",
          hostingResource: "azure-web-app",
        },
      ],
    },
  };
  const action = await getAction("fx.add", context, inputs);
  if (action) {
    const resolved = await resolveAction(action, context, inputs);
    await fs.writeFile("tabAddBot.json", JSON.stringify(resolved, undefined, 4));
    await planAction(action, context, inputs);
    inputs.step = 1;
    await executeAction(action, context, inputs);
  }
  console.log("inputs:");
  console.log(inputs);
  console.log("projectSetting:");
  console.log(projectSetting);
}

tabAddBot();
