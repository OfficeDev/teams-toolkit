// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureAccountProvider,
  FxError,
  Inputs,
  ok,
  Platform,
  ProjectSettings,
  Result,
  SubscriptionInfo,
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
import { MockFeaturePluginNames } from "./mockPlugins";
import * as path from "path";
import * as os from "os";
import { randomAppName } from "../../core/utils";
import { resourceGroupHelper } from "../../../src/plugins/solution/fx-solution/utils/ResourceGroupHelper";
import { ResourceManagementClient } from "@azure/arm-resources";
describe("SolutionV3 - provision", () => {
  const sandbox = sinon.createSandbox();
  beforeEach(async () => {
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
    sandbox
      .stub<any, any>(resourceGroupHelper, "askResourceGroupInfo")
      .callsFake(
        async (
          ctx: v2.Context,
          inputs: Inputs,
          azureAccountProvider: AzureAccountProvider,
          rmClient: ResourceManagementClient,
          defaultResourceGroupName: string
        ): Promise<Result<any, FxError>> => {
          return ok({
            createNewResourceGroup: false,
            name: "mockRG",
            location: "mockLoc",
          });
        }
      );
  });
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
        activeResourcePlugins: [MockFeaturePluginNames.tab],
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
    const mockSub: SubscriptionInfo = {
      subscriptionId: "mockSubId",
      subscriptionName: "mockSubName",
      tenantId: "mockTenantId",
    };
    sandbox
      .stub<any, any>(mockedTokenProvider.azureAccountProvider, "listSubscriptions")
      .callsFake(async (): Promise<SubscriptionInfo[]> => {
        return [mockSub];
      });
    sandbox
      .stub<any, any>(mockedTokenProvider.appStudioToken, "getJsonObject")
      .callsFake(async (showDialog?: boolean): Promise<Record<string, unknown> | undefined> => {
        return { tid: "mock-tenant-id" };
      });
    sandbox
      .stub<any, any>(ctx.userInteraction, "showMessage")
      .callsFake(
        async (
          level: "info" | "warn" | "error",
          message: string,
          modal: boolean,
          ...items: string[]
        ): Promise<Result<string | undefined, FxError>> => {
          return ok("Provision");
        }
      );

    const envInfoV3: v3.EnvInfoV3 = {
      envName: "dev",
      state: { solution: { ...mockSub }, "fx-resource-appstudio": {} },
      config: {},
    };
    const res = await provisionResources(ctx, inputs, envInfoV3, mockedTokenProvider);
    assert.isTrue(res.isOk());
    if (res.isOk()) {
      assert.isTrue(res.value.state["fx-resource-appstudio"].tenantId === "mock-tenant-id");
    }
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
        activeResourcePlugins: [MockFeaturePluginNames.tab],
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
    const envInfoV3: v2.DeepReadonly<v3.EnvInfoV3> = {
      envName: "dev",
      config: {},
      state: { solution: {} },
    };
    const res = await getQuestionsForProvision(ctx, inputs, envInfoV3, mockedTokenProvider);
    assert.isTrue(res.isOk());
  });
});
