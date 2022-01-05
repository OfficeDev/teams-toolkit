// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Platform, ProjectSettings, TokenProvider, v2, v3 } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import * as uuid from "uuid";
import {
  BuiltInResourcePluginNames,
  TeamsFxAzureSolutionNameV3,
} from "../../../src/plugins/solution/fx-solution/v3/constants";
import { deploy, getQuestionsForDeploy } from "../../../src/plugins/solution/fx-solution/v3/deploy";
import {
  MockedAppStudioTokenProvider,
  MockedAzureAccountProvider,
  MockedGraphTokenProvider,
  MockedSharepointProvider,
  MockedV2Context,
} from "../solution/util";
import { MockResourcePluginNames } from "./mockPlugins";

describe("SolutionV3 - deploy", () => {
  it("deploy", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: TeamsFxAzureSolutionNameV3,
        version: "3.0.0",
        capabilities: ["Tab"],
        hostType: "Azure",
        azureResources: [],
        modules: [
          {
            capabilities: ["Tab"],
            hostingPlugin: MockResourcePluginNames.storage,
            dir: "tabs",
            buildPath: "build",
            deployType: "folder",
          },
        ],
        activeResourcePlugins: [MockResourcePluginNames.storage],
      },
    };
    const ctx = new MockedV2Context(projectSettings);
    const inputs: v2.InputsWithProjectPath & { modules: string[] } = {
      platform: Platform.VSCode,
      projectPath: ".",
      modules: ["0", "1"],
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
    const res = await deploy(ctx, inputs, envInfov3, mockedTokenProvider);
    assert.isTrue(res.isOk());
  });

  it("getQuestionsForDeploy", async () => {
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
          {
            capabilities: ["Tab"],
            hostingPlugin: BuiltInResourcePluginNames.storage,
            dir: "tabs",
            buildPath: "build",
            deolpyType: "folder",
          },
          {
            capabilities: ["Bot"],
            hostingPlugin: BuiltInResourcePluginNames.bot,
            dir: "bot",
            buildPath: "build",
            deployType: "folder",
          },
        ],
        activeResourcePlugins: [BuiltInResourcePluginNames.storage, BuiltInResourcePluginNames.bot],
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
    const res = await getQuestionsForDeploy(ctx, inputs, envInfov3, mockedTokenProvider);
    assert.isTrue(res.isOk());
  });
});
