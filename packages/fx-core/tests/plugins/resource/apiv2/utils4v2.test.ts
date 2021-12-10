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
import { LocalCrypto } from "../../../../src/core/crypto";
import {
  assignJsonInc,
  provisionResourceAdapter,
  setEnvInfoV1ByStateV2,
  setLocalSettingsV1,
  setLocalSettingsV2,
  setStateV2ByConfigMapInc,
} from "../../../../src/plugins/resource/utils4v2";
import {
  MockAppStudioTokenProvider,
  MockAzureAccountProvider,
  MockGraphTokenProvider,
  MockSharepointTokenProvider,
  MockTools,
  randomAppName,
} from "../../../core/utils";

describe("API V2 adapter", () => {
  beforeEach(() => {});

  afterEach(async () => {});

  it("assignJsonInc", async () => {
    const json1: Json = { k1: undefined, k2: "v2", k3: "" };
    const json2: Json = { k1: 1, k3: "v3", k4: false };

    {
      const res = assignJsonInc(undefined, json2);
      assert.isTrue(res === json2);
    }

    {
      const res = assignJsonInc(json1, undefined);
      assert.isTrue(res === json1);
    }

    {
      const res = assignJsonInc(json1, json2);
      assert.deepEqual(res, { k1: 1, k2: "v2", k3: "v3", k4: false });
    }
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
      cryptoProvider: new LocalCrypto(""),
    };
    const localSettings: Json = {};
    setLocalSettingsV2(localSettings, pluginContext.localSettings);
    const expected: Json = {
      teamsApp: { k1: "v1" },
      auth: { k2: "v2" },
      backend: undefined,
      bot: undefined,
      frontend: undefined,
    };
    setLocalSettingsV1(pluginContext, expected);
    assert.equal(pluginContext.localSettings?.teamsApp?.get("k1"), "v1");
    assert.equal(pluginContext.localSettings?.auth?.get("k2"), "v2");
  });

  it("setEnvInfoV1ByProfileV2", async () => {
    const pluginContext: PluginContext = {
      root: "",
      config: new ConfigMap(),
      envInfo: newEnvInfo(),
      cryptoProvider: new LocalCrypto(""),
    };
    const provisionOutputs: Json = {
      plugin1: { k1: "v1" },
      plugin2: { k2: "v2" },
    };
    const envInfo: EnvInfoV2 = {
      envName: "default",
      config: {},
      state: provisionOutputs,
    };
    setEnvInfoV1ByStateV2("plugin1", pluginContext, envInfo);
    assert.equal(pluginContext.config.get("k1"), "v1");
    assert.equal((pluginContext.envInfo.state.get("plugin2") as ConfigMap).get("k2"), "v2");
  });

  it("setProfileV2ByConfigMapInc", async () => {
    const config = new ConfigMap([
      ["k1", "v1"],
      ["k2", "v2"],
    ]);
    const provisionOutputs: Json = {
      plugin1: { output: { k1: "", k2: "" }, secrets: {} },
      plugin2: { output: { k2: "v2" }, secrets: {} },
    };
    setStateV2ByConfigMapInc("plugin1", provisionOutputs, config);
    assert.deepEqual(provisionOutputs["plugin1"]["output"], { k1: "v1", k2: "v2" });
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
      subscriptionId: "xxx",
      tenantId: "xxxx",
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
      cryptoProvider: tools.cryptoProvider,
      projectSetting: projectSettings,
      permissionRequestProvider: tools.permissionRequestProvider,
    };
    const provisionInputConfig: EnvConfig = {
      azure: { subscriptionId: "123455", resourceGroupName: "rg" },
      manifest: { appName: { short: appName } },
    };
    const envInfo: EnvInfoV2 = {
      envName: "default",
      config: provisionInputConfig,
      state: {},
    };
    const tokenProvider: TokenProvider = {
      appStudioToken: new MockAppStudioTokenProvider(),
      graphTokenProvider: new MockGraphTokenProvider(),
      azureAccountProvider: new MockAzureAccountProvider(),
      sharepointTokenProvider: new MockSharepointTokenProvider(),
    };

    const res = await provisionResourceAdapter(context, inputs, envInfo, tokenProvider, plugin);

    assert.isTrue(res.isOk());
  });
});
