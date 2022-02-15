// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Platform, ProjectSettings, v2, v3 } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import * as uuid from "uuid";
import {
  publishApplication,
  getQuestionsForPublish,
} from "../../../src/plugins/solution/fx-solution/v3/publish";
import { TeamsFxAzureSolutionNameV3 } from "../../../src/plugins/solution/fx-solution/v3/constants";
import { MockedAppStudioTokenProvider, MockedV2Context } from "../solution/util";
import * as path from "path";
import * as os from "os";
import { randomAppName } from "../../core/utils";
describe("SolutionV3 - publish", () => {
  it("publish", async () => {
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
    const envInfov3: v3.EnvInfoV3 = {
      envName: "dev",
      state: { solution: {} },
      config: {},
    };
    const res = await publishApplication(
      ctx,
      inputs,
      envInfov3,
      new MockedAppStudioTokenProvider()
    );
    assert.isTrue(res.isErr());
  });

  it("getQuestionsForPublish", async () => {
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
    const envInfov3: v2.DeepReadonly<v3.EnvInfoV3> = {
      envName: "dev",
      config: {},
      state: { solution: {} },
    };
    const res = await getQuestionsForPublish(
      ctx,
      inputs,
      envInfov3,
      new MockedAppStudioTokenProvider()
    );
    assert.isTrue(res.isOk());
  });
});
