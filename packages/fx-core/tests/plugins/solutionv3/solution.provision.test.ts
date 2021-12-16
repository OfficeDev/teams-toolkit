// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Platform, ProjectSettings, TokenProvider, v2, v3 } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import * as uuid from "uuid";
import { TeamsFxAzureSolutionNameV3 } from "../../../src/plugins/solution/fx-solution/v3/constants";
import {
  getQuestionsForProvision,
  provisionResources,
} from "../../../src/plugins/solution/fx-solution/v3/provision";
import {
  MockedAppStudioTokenProvider,
  MockedAzureAccountProvider,
  MockedGraphTokenProvider,
  MockedSharepointProvider,
  MockedV2Context,
} from "../solution/util";

describe("SolutionV3 - provision", () => {
  it("provision", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: TeamsFxAzureSolutionNameV3,
        version: "3.0.0",
        capabilities: ["Tab", "Bot"],
        hostType: "Azure",
        azureResources: [],
        modules: [
          { capabilities: ["Tab"], hostingPlugin: "fx-resource-azure-storage" },
          { capabilities: ["Bot"], hostingPlugin: "fx-resource-azure-bot" },
        ],
        activeResourcePlugins: [
          "fx-resource-azure-storage",
          "fx-resource-azure-bot",
          "fx-resource-azure-web-app",
        ],
      },
    };
    const ctx = new MockedV2Context(projectSettings);
    const inputs: v2.InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const mockedTokenProvider: TokenProvider = {
      azureAccountProvider: new MockedAzureAccountProvider(),
      appStudioToken: new MockedAppStudioTokenProvider(),
      graphTokenProvider: new MockedGraphTokenProvider(),
      sharepointTokenProvider: new MockedSharepointProvider(),
    };
    const envInfov3: v3.EnvInfoV3 = {
      envName: "dev",
      state: { solution: {} },
      config: {},
    };
    const res = await provisionResources(ctx, inputs, envInfov3, mockedTokenProvider);
    // assert.isTrue(res.isErr());
  });

  it("getQuestionsForProvision", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: TeamsFxAzureSolutionNameV3,
        version: "3.0.0",
        capabilities: ["Tab", "Bot"],
        hostType: "Azure",
        azureResources: [],
        modules: [
          { capabilities: ["Tab"], hostingPlugin: "fx-resource-azure-storage" },
          { capabilities: ["Bot"], hostingPlugin: "fx-resource-azure-bot" },
        ],
        activeResourcePlugins: [
          "fx-resource-azure-storage",
          "fx-resource-azure-bot",
          "fx-resource-azure-web-app",
        ],
      },
    };
    const ctx = new MockedV2Context(projectSettings);
    const inputs: v2.InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const mockedTokenProvider: TokenProvider = {
      azureAccountProvider: new MockedAzureAccountProvider(),
      appStudioToken: new MockedAppStudioTokenProvider(),
      graphTokenProvider: new MockedGraphTokenProvider(),
      sharepointTokenProvider: new MockedSharepointProvider(),
    };
    const envInfov3: v3.EnvInfoV3 = {
      envName: "dev",
      state: { solution: {} },
      config: {},
    };
    const res = await getQuestionsForProvision(ctx, inputs, envInfov3, mockedTokenProvider);
    assert.isTrue(res.isOk());
  });
});
