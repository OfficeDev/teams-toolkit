// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs, Platform, ProjectSettings } from "@microsoft/teamsfx-api";
import { InputsWithProjectPath } from "@microsoft/teamsfx-api/build/v2";
import { assert } from "chai";
import "mocha";
import * as uuid from "uuid";
import { TeamsFxAzureSolutionNameV3 } from "../../../src/plugins/solution/fx-solution/v3/constants";
import { init } from "../../../src/plugins/solution/fx-solution/v3/init";
import { MockedV2Context } from "../solution/util";

describe("SolutionV3", () => {
  const inputs: Inputs = { platform: Platform.VSCode };
  it("init - capability Tab", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: TeamsFxAzureSolutionNameV3,
      },
    };
    const ctx = new MockedV2Context(projectSettings);
    const inputs: InputsWithProjectPath & { capabilities: string[] } = {
      platform: Platform.VSCode,
      projectPath: ".",
      capabilities: ["Tab"],
    };
    const res = await init(ctx, inputs);
    assert.isTrue(res.isOk());
    assert.deepEqual(projectSettings.solutionSettings, {
      name: TeamsFxAzureSolutionNameV3,
      version: "3.0.0",
      capabilities: ["Tab"],
      hostType: "",
      azureResources: [],
      modules: [{ capabilities: ["Tab"] }],
      activeResourcePlugins: [],
    });
  });
  it("init - capability empty", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: TeamsFxAzureSolutionNameV3,
      },
    };
    const ctx = new MockedV2Context(projectSettings);
    const inputs: InputsWithProjectPath & { capabilities: string[] } = {
      platform: Platform.VSCode,
      projectPath: ".",
      capabilities: [],
    };
    const res = await init(ctx, inputs);
    assert.isTrue(res.isOk());
    assert.deepEqual(projectSettings.solutionSettings, {
      name: TeamsFxAzureSolutionNameV3,
      version: "3.0.0",
      capabilities: [],
      hostType: "",
      azureResources: [],
      modules: [],
      activeResourcePlugins: [],
    });
  });
});
