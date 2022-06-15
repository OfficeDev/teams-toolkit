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
} from "../../../../../src/plugins/solution/fx-solution/v3/constants";
import { Container } from "typedi";
import {
  MockedM365Provider,
  MockedAzureAccountProvider,
  MockedV2Context,
} from "../../../solution/util";
import { randomAppName } from "../../../../core/utils";
import sinon from "sinon";
import { SqlMgrClient } from "../../../../../src/plugins/resource/sql/managementClient";
import "../../../../../src/plugins/resource/sql/v3";
import { SqlPluginV3 } from "../../../../../src/plugins/resource/sql/v3";
describe("SQL V3 API", () => {
  const sandbox = sinon.createSandbox();
  beforeEach(async () => {});
  afterEach(async () => {
    sandbox.restore();
  });
  it("getQuestionsForProvision (sql not exist)", async () => {
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
      state: { solution: {}, [BuiltInFeaturePluginNames.sql]: {} },
    };
    const sqlPlugin = new SqlPluginV3();
    const res = await sqlPlugin.getQuestionsForProvision!(
      ctx,
      inputs,
      envInfoV3,
      mockedTokenProvider
    );
    assert.isTrue(res.isOk());
  });

  it("getQuestionsForProvision (sql already exist)", async () => {
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
      state: { solution: {}, [BuiltInFeaturePluginNames.sql]: {} },
    };
    const sqlPlugin = new SqlPluginV3();
    sandbox.stub<any, any>(SqlMgrClient, "existAzureSQL").resolves(true);
    const res = await sqlPlugin.getQuestionsForProvision!(
      ctx,
      inputs,
      envInfoV3,
      mockedTokenProvider
    );
    assert.isTrue(res.isOk());
  });
});
