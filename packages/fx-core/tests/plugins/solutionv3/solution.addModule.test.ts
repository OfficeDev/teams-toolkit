// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Platform, ProjectSettings, v2 } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import * as uuid from "uuid";
import {
  addModule,
  getQuestionsForAddModule,
} from "../../../src/plugins/solution/fx-solution/v3/addModule";
import { TeamsFxAzureSolutionNameV3 } from "../../../src/plugins/solution/fx-solution/v3/constants";
import { MockedV2Context } from "../solution/util";
import * as path from "path";
import * as os from "os";
import { randomAppName } from "../../core/utils";
describe("SolutionV3 - addModule", () => {
  it("add tab success", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: TeamsFxAzureSolutionNameV3,
        version: "3.0.0",
        capabilities: [],
        hostType: "",
        azureResources: [],
        modules: [],
        activeResourcePlugins: [],
      },
    };
    const ctx = new MockedV2Context(projectSettings);
    const inputs: v2.InputsWithProjectPath & { capabilities: string[] } = {
      platform: Platform.VSCode,
      projectPath: path.join(os.tmpdir(), randomAppName()),
      capabilities: ["Tab"],
    };
    const res = await addModule(ctx, inputs);
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
    if (res.isOk()) {
      const localSettings = res.value;
      assert.isTrue(localSettings !== undefined);
    }
  });

  it("add tab failed", async () => {
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
    const inputs: v2.InputsWithProjectPath & { capabilities: string[] } = {
      platform: Platform.VSCode,
      projectPath: path.join(os.tmpdir(), randomAppName()),
      capabilities: ["Tab"],
    };
    const res = await addModule(ctx, inputs);
    assert.isTrue(res.isErr());
  });

  it("add bot success", async () => {
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
    const inputs: v2.InputsWithProjectPath & { capabilities: string[] } = {
      platform: Platform.VSCode,
      projectPath: path.join(os.tmpdir(), randomAppName()),
      capabilities: ["Bot"],
    };
    const res = await addModule(ctx, inputs);
    assert.isTrue(res.isOk());
    assert.deepEqual(projectSettings.solutionSettings, {
      name: TeamsFxAzureSolutionNameV3,
      version: "3.0.0",
      capabilities: ["Tab", "Bot"],
      hostType: "",
      azureResources: [],
      modules: [{ capabilities: ["Tab"] }, { capabilities: ["Bot"] }],
      activeResourcePlugins: [],
    });
  });

  it("getQuestionsForAddModule", async () => {
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
      projectPath: path.join(os.tmpdir(), randomAppName()),
    };
    const res = await getQuestionsForAddModule(ctx, inputs);
    assert.isTrue(res.isOk());
  });
});
