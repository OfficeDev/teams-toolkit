// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Platform, ProjectSettings, v2 } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import "reflect-metadata";
import * as uuid from "uuid";
import {
  addResource,
  getQuestionsForAddResource,
} from "../../../src/plugins/solution/fx-solution/v3/addResource";
import { TeamsFxAzureSolutionNameV3 } from "../../../src/plugins/solution/fx-solution/v3/constants";
import {
  getQuestionsForScaffold,
  scaffold,
} from "../../../src/plugins/solution/fx-solution/v3/scaffold";
import { MockedV2Context } from "../solution/util";

describe("SolutionV3 - addResource", () => {
  it("addResource", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: TeamsFxAzureSolutionNameV3,
        version: "3.0.0",
        capabilities: ["Bot"],
        hostType: "",
        azureResources: [],
        modules: [{ capabilities: ["Bot"] }],
        activeResourcePlugins: [],
      },
    };
    const ctx = new MockedV2Context(projectSettings);
    const inputs: v2.InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: ".",
      module: 0,
      resource: "fx-resource-azure-bot",
      test: true,
    };
    const res = await addResource(ctx, inputs);
    assert.isTrue(res.isOk());
    assert.deepEqual(projectSettings.solutionSettings, {
      name: TeamsFxAzureSolutionNameV3,
      version: "3.0.0",
      capabilities: ["Bot"],
      hostType: "",
      azureResources: [],
      modules: [{ capabilities: ["Bot"], hostingPlugin: "fx-resource-azure-bot" }],
      activeResourcePlugins: ["fx-resource-azure-bot", "fx-resource-azure-web-app"],
    });
  });

  it("getQuestionsForAddResource", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: TeamsFxAzureSolutionNameV3,
        version: "3.0.0",
        capabilities: ["Tab"],
        hostType: "",
        azureResources: [],
        modules: [{ capabilities: ["Tab"] }],
        activeResourcePlugins: [],
      },
    };
    const ctx = new MockedV2Context(projectSettings);
    const inputs: v2.InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const res = await getQuestionsForAddResource(ctx, inputs);
    assert.isTrue(res.isOk());
  });
});
