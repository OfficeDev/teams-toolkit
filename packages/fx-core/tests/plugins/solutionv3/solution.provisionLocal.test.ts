// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  Inputs,
  Json,
  ok,
  Platform,
  ProjectSettings,
  Result,
  TokenProvider,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import * as uuid from "uuid";
import { TeamsFxAzureSolutionNameV3 } from "../../../src/plugins/solution/fx-solution/v3/constants";
import {
  getQuestionsForLocalProvision,
  provisionLocalResources,
} from "../../../src/plugins/solution/fx-solution/v3/provisionLocal";
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
import sinon from "sinon";
import { MockResourcePluginNames } from "./mockPlugins";
import * as localDebug from "../../../src/plugins/solution/fx-solution/debug/provisionLocal";
describe("SolutionV3 - provisionLocalResources", () => {
  const sandbox = sinon.createSandbox();
  beforeEach(async () => {});
  afterEach(async () => {
    sandbox.restore();
  });
  it("provisionLocalResources", async () => {
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
      projectPath: path.join(os.tmpdir(), randomAppName()),
    };
    const mockedTokenProvider: TokenProvider = {
      azureAccountProvider: new MockedAzureAccountProvider(),
      appStudioToken: new MockedAppStudioTokenProvider(),
      graphTokenProvider: new MockedGraphTokenProvider(),
      sharepointTokenProvider: new MockedSharepointProvider(),
    };
    sandbox
      .stub<any, any>(mockedTokenProvider.appStudioToken, "getJsonObject")
      .callsFake(async (showDialog?: boolean): Promise<Record<string, unknown> | undefined> => {
        return { tid: "mock-tenant-id" };
      });
    sandbox
      .stub<any, any>(localDebug, "setupLocalDebugSettings")
      .callsFake(
        async (
          ctx: v2.Context,
          inputs: Inputs,
          localSettings: Json
        ): Promise<Result<Void, FxError>> => {
          return ok(Void);
        }
      );
    sandbox
      .stub<any, any>(localDebug, "configLocalDebugSettings")
      .callsFake(
        async (
          ctx: v2.Context,
          inputs: Inputs,
          localSettings: Json
        ): Promise<Result<Void, FxError>> => {
          return ok(Void);
        }
      );
    const localSettings: v2.LocalSettings = {
      teamsApp: {},
    };
    const res = await provisionLocalResources(ctx, inputs, localSettings, mockedTokenProvider);
    assert.isTrue(res.isOk());
    if (res.isOk()) {
      assert.isTrue(res.value.teamsApp.tenantId === "mock-tenant-id");
    }
  });

  it("getQuestionsForProvision", async () => {
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
    const res = await getQuestionsForLocalProvision(ctx, inputs, mockedTokenProvider);
    assert.isTrue(res.isOk());
  });
});
