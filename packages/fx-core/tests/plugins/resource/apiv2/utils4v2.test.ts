// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureSolutionSettings,
  ConfigMap,
  EnvConfig,
  FxError,
  Json,
  ok,
  Platform,
  Plugin,
  PluginContext,
  ProjectSettings,
  Result,
  TokenProvider,
  Void,
} from "@microsoft/teamsfx-api";
import { Context, EnvInfoV2, ProvisionInputs } from "@microsoft/teamsfx-api/build/v2";
import { assert } from "chai";
import "mocha";
import { newEnvInfo } from "../../../../src";
import { TabLanguage } from "../../../../src/plugins/resource/frontend/resources/templateInfo";
import {
  provisionResourceAdapter,
  setConfigs,
  setLocalSettingsV1,
  setLocalSettingsV2,
  setProvisionOutputs,
} from "../../../../src/plugins/resource/utils4v2";
import {
  MockAppStudioTokenProvider,
  MockAzureAccountProvider,
  MockGraphTokenProvider,
  MockTools,
  randomAppName,
} from "../../../core/utils";
import Container from "typedi";
import {
  ResourcePlugins,
  ResourcePluginsV2,
} from "../../../../src/plugins/solution/fx-solution/ResourcePluginContainer";

describe("API V2 adapter", () => {
  beforeEach(() => {});

  afterEach(async () => {});

  it("setProvisionOutputs", async () => {
    const pluginContext: PluginContext = {
      root: "",
      config: new ConfigMap(),
      envInfo: newEnvInfo(),
    };
    pluginContext.envInfo.profile.set(
      "plugin1",
      new ConfigMap([
        ["k1", "v1"],
        ["k2", "v2"],
      ])
    );
    pluginContext.envInfo.profile.set(
      "plugin2",
      new ConfigMap([
        ["k3", "v3"],
        ["k4", "v4"],
      ])
    );
    const provisionOutputs: Json = {};
    setProvisionOutputs(provisionOutputs, pluginContext);
    const expected: Json = {
      plugin1: { k1: "v1", k2: "v2" },
      plugin2: { k3: "v3", k4: "v4" },
      solution: {},
    };
    assert.deepEqual(expected, provisionOutputs);
  });

  it("setLocalSettings", async () => {
    const pluginContext: PluginContext = {
      root: "",
      config: new ConfigMap(),
      envInfo: newEnvInfo(),
      localSettings: {
        teamsApp: new ConfigMap([["k1", "v1"]]),
        auth: new ConfigMap([["k2", "v2"]]),
      },
    };
    const localSettings: Json = {};
    setLocalSettingsV2(localSettings, pluginContext);
    const expected: Json = {
      teamsApp: { k1: "v1" },
      auth: { k2: "v2" },
      backend: undefined,
      bot: undefined,
      frontend: undefined,
    };
    assert.deepEqual(expected, localSettings);
    setLocalSettingsV1(pluginContext, expected);
    assert.equal(pluginContext.localSettings?.teamsApp.get("k1"), "v1");
    assert.equal(pluginContext.localSettings?.auth?.get("k2"), "v2");
  });

  it("setConfigs", async () => {
    const pluginContext: PluginContext = {
      root: "",
      config: new ConfigMap(),
      envInfo: newEnvInfo(),
    };
    const provisionOutputs: Json = {
      plugin1: { k1: "v1" },
      plugin2: { k2: "v2" },
    };
    setConfigs("plugin1", pluginContext, provisionOutputs);
    assert.equal(pluginContext.config.get("k1"), "v1");
    assert.equal((pluginContext.envInfo.profile.get("plugin2") as ConfigMap).get("k2"), "v2");
  });

  it("provisionResourceAdapter", async () => {
    const tools = new MockTools();
    const plugin: Plugin = {
      name: "test-plugin",
      displayName: "test plugin",
      activate: (solutionSettings: AzureSolutionSettings) => true,
    };
    plugin.preProvision = async function (_ctx: PluginContext): Promise<Result<any, FxError>> {
      return ok(Void);
    };
    plugin.provision = async function (_ctx: PluginContext): Promise<Result<any, FxError>> {
      return ok(Void);
    };
    plugin.postProvision = async function (_ctx: PluginContext): Promise<Result<any, FxError>> {
      return ok(Void);
    };
    const appName = randomAppName();
    const inputs: ProvisionInputs = {
      platform: Platform.VSCode,
      projectPath: ".",
      resourceNameSuffix: "pref",
      resourceGroupName: "rwer",
      location: "US",
      teamsAppTenantId: "123",
    };
    const projectSettings: ProjectSettings = {
      appName: appName,
      projectId: "12354",
      version: "2",
      programmingLanguage: TabLanguage.JavaScript,
      solutionSettings: {
        name: "solution",
        activeResourcePlugins: [
          plugin.name,
          "fx-resource-aad-app-for-teams",
          "fx-resource-simple-auth",
        ],
      },
    };
    const context: Context = {
      userInteraction: tools.ui,
      logProvider: tools.logProvider,
      telemetryReporter: tools.telemetryReporter,
      // cryptoProvider: tools.cryptoProvider,
      projectSetting: projectSettings,
      permissionRequestProvider: tools.permissionRequestProvider,
    };
    const provisionInputConfig: EnvConfig = {
      azure: { subscriptionId: "123455", resourceGroupName: "rg" },
      manifest: { values: { appName: { short: appName } } },
    };
    const envInfo: EnvInfoV2 = {
      envName: "default",
      config: provisionInputConfig,
      profile: {},
    };
    const tokenProvider: TokenProvider = {
      appStudioToken: new MockAppStudioTokenProvider(),
      graphTokenProvider: new MockGraphTokenProvider(),
      azureAccountProvider: new MockAzureAccountProvider(),
    };

    const res = await provisionResourceAdapter(context, inputs, envInfo, tokenProvider, plugin);

    assert.isTrue(res.isOk());
  });
});
