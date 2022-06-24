// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Platform, ProjectSettings, TokenProvider, v2, v3 } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import * as uuid from "uuid";
import * as os from "os";
import * as path from "path";
import {
  BuiltInFeaturePluginNames,
  BuiltInSolutionNames,
} from "../../../../src/plugins/solution/fx-solution/v3/constants";
import { Container } from "typedi";
import {
  MockedAzureAccountProvider,
  MockedM365Provider,
  MockedV2Context,
} from "../../solution/util";
import { randomAppName } from "../../../core/utils";
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
    const envInfoV3: v2.DeepReadonly<v3.EnvInfoV3> = {
      envName: "dev",
      config: {},
      state: { solution: {}, "fx-resource-apim": {} },
    };
    const apimPlugin = Container.get<v3.PluginV3>(BuiltInFeaturePluginNames.apim);
    const res = await apimPlugin.getQuestionsForDeploy!(
      ctx,
      inputs,
      envInfoV3,
      mockedTokenProvider
    );
    assert.isTrue(res.isOk());
  });
});
