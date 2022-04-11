// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Platform, v2, v3 } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import "reflect-metadata";
import { createV2Context } from "../../../common";
import { setTools } from "../../globalVars";
import "../core";
import { MockTools } from "../utils";
import { executeAction, getAction, planAction, resolveAction } from "../workflow";
import { cloneDeep } from "lodash";
import { ProjectSettingsV3 } from "../interface";

async function provisionSPFx() {
  const tools = new MockTools();
  setTools(tools);
  const projectSetting: ProjectSettingsV3 = {
    projectId: "123",
    appName: "test",
    solutionSettings: { name: "fx", activeResourcePlugins: [] },
    programmingLanguage: "typescript",
    components: [
      {
        name: "teams-tab",
        framework: "spfx",
        hostingResource: "spfx",
        folder: "SPFx",
      },
      {
        name: "tab-scaffold",
        build: true,
        deployType: "zip",
        folder: "SPFx",
        language: "typescript",
        framework: "spfx",
        hostingResource: "spfx",
      },
      { name: "spfx", provision: true },
    ],
  };

  const envInfo: v3.EnvInfoV3 = {
    envName: "dev",
    config: {},
    state: { solution: {} },
  };
  const context = {
    ctx: createV2Context(projectSetting),
    envInfo: envInfo,
    tokenProvider: tools.tokenProvider,
  };

  const inputs: v2.InputsWithProjectPath = {
    projectPath: path.join(os.tmpdir(), "myapp"),
    platform: Platform.VSCode,
  };
  const action = await getAction("fx.provision", context, inputs);
  if (action) {
    const resolved = await resolveAction(action, context, cloneDeep(inputs));
    fs.writeFileSync("provisionSPFx.json", JSON.stringify(resolved, undefined, 4));
    await planAction(action, context, cloneDeep(inputs));
    await executeAction(action, context, inputs);
  }
  console.log("inputs:");
  console.log(inputs);
  console.log("projectSetting:");
  console.log(projectSetting);
}

provisionSPFx();
