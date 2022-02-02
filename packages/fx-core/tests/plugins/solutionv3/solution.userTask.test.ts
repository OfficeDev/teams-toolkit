// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Platform, ProjectSettings, TokenProvider, v2, v3 } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import * as uuid from "uuid";
import { TeamsFxAzureSolutionNameV3 } from "../../../src/plugins/solution/fx-solution/v3/constants";
import {
  executeUserTask,
  getQuestionsForUserTask,
} from "../../../src/plugins/solution/fx-solution/v3/userTask";
import {
  MockedAppStudioTokenProvider,
  MockedAzureAccountProvider,
  MockedGraphTokenProvider,
  MockedSharepointProvider,
  MockedV2Context,
} from "../solution/util";
import * as path from "path";
import * as os from "os";
import { randomAppName } from "../../core/utils";
describe("SolutionV3 - executeUserTask", () => {
  it("executeUserTask", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: TeamsFxAzureSolutionNameV3,
      },
    };
    const ctx = new MockedV2Context(projectSettings);
    const inputs: v2.InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: path.join(os.tmpdir(), randomAppName()),
    };
    const mockedTokenProvider: TokenProvider = {
      azureAccountProvider: new MockedAzureAccountProvider(),
      appStudioToken: new MockedAppStudioTokenProvider(),
      graphTokenProvider: new MockedGraphTokenProvider(),
      sharepointTokenProvider: new MockedSharepointProvider(),
    };
    const envInfoV3: v3.EnvInfoV3 = {
      envName: "dev",
      state: { solution: {} },
      config: {},
    };
    const res = await executeUserTask(
      ctx,
      inputs,
      { namespace: "", method: "aa" },
      envInfoV3,
      mockedTokenProvider
    );
    assert.isTrue(res.isErr());
  });

  it("getQuestionsForUserTask", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: TeamsFxAzureSolutionNameV3,
      },
    };
    const ctx = new MockedV2Context(projectSettings);
    const inputs: v2.InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: path.join(os.tmpdir(), randomAppName()),
    };
    const mockedTokenProvider: TokenProvider = {
      azureAccountProvider: new MockedAzureAccountProvider(),
      appStudioToken: new MockedAppStudioTokenProvider(),
      graphTokenProvider: new MockedGraphTokenProvider(),
      sharepointTokenProvider: new MockedSharepointProvider(),
    };
    const res = await getQuestionsForUserTask(
      ctx,
      inputs,
      { namespace: "", method: "aa" },
      { envName: "dev", config: {}, state: { solution: {} } },
      mockedTokenProvider
    );
    assert.isTrue(res.isOk());
  });
});
