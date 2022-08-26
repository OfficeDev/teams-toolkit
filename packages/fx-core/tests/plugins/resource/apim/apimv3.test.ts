// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ContextV3,
  Platform,
  ProjectSettings,
  ResourceContextV3,
  TokenProvider,
  v2,
  v3,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import * as os from "os";
import * as path from "path";
import * as uuid from "uuid";
import { BuiltInSolutionNames } from "../../../../src/plugins/solution/fx-solution/v3/constants";
import { randomAppName } from "../../../core/utils";
import {
  MockedAzureAccountProvider,
  MockedM365Provider,
  MockedV2Context,
} from "../../solution/util";
import { getQuestionsForDeployAPIM } from "../../../../src/component/resource/apim";
describe("APIM V3 API", () => {
  it("getQuestionsForDeploy", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: BuiltInSolutionNames.azure,
        version: "3.0.0",
        capabilities: ["Tab"],
        hostType: "Azure",
        azureResources: [],
        activeResourcePlugins: [],
      },
    };
    const ctx = new MockedV2Context(projectSettings);
    const inputs: v2.InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: path.join(os.tmpdir(), randomAppName()),
    };
    const mockedTokenProvider: TokenProvider = {
      azureAccountProvider: new MockedAzureAccountProvider(),
      m365TokenProvider: new MockedM365Provider(),
    };
    const envInfoV3: v3.EnvInfoV3 = {
      envName: "dev",
      config: {},
      state: { solution: {}, "fx-resource-apim": {} },
    };
    const context = ctx as ContextV3;
    context.envInfo = envInfoV3;
    context.tokenProvider = mockedTokenProvider;
    const res = await getQuestionsForDeployAPIM(context as ResourceContextV3, inputs);
    assert.isTrue(res.isOk());
  });
});
