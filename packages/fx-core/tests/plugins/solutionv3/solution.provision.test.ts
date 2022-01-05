// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureAccountProvider,
  FxError,
  ok,
  Platform,
  ProjectSettings,
  Result,
  TokenProvider,
  v2,
  v3,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import sinon from "sinon";
import * as uuid from "uuid";
import arm from "../../../src/plugins/solution/fx-solution/arm";
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
import { MockResourcePluginNames } from "./mockPlugins";

describe("SolutionV3 - provision", () => {
  const sandbox = sinon.createSandbox();
  afterEach(async () => {
    sandbox.restore();
  });
  it("provision", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: TeamsFxAzureSolutionNameV3,
        version: "3.0.0",
        capabilities: ["Tab"],
        hostType: "Azure",
        azureResources: [],
        modules: [{ capabilities: ["Tab"], hostingPlugin: MockResourcePluginNames.storage }],
        activeResourcePlugins: [MockResourcePluginNames.storage],
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
    sandbox
      .stub<any, any>(arm, "deployArmTemplates")
      .callsFake(
        async (
          ctx: v2.Context,
          inputs: v2.InputsWithProjectPath,
          envInfo: v3.EnvInfoV3,
          azureAccountProvider: AzureAccountProvider
        ): Promise<Result<void, FxError>> => {
          return ok(undefined);
        }
      );
    const res = await provisionResources(ctx, inputs, envInfov3, mockedTokenProvider);
    assert.isTrue(res.isOk());
  });

  it("getQuestionsForProvision", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: TeamsFxAzureSolutionNameV3,
        version: "3.0.0",
        capabilities: ["Tab"],
        hostType: "Azure",
        azureResources: [],
        modules: [{ capabilities: ["Tab"], hostingPlugin: MockResourcePluginNames.storage }],
        activeResourcePlugins: [MockResourcePluginNames.storage],
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
    const res = await getQuestionsForProvision(ctx, inputs, mockedTokenProvider);
    assert.isTrue(res.isOk());
  });
});
