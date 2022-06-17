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
  v2,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import { newEnvInfo, setTools } from "../../../../src";
import { TabLanguage } from "../../../../src/plugins/resource/frontend/resources/templateInfo";
import { LocalCrypto } from "../../../../src/core/crypto";
import {
  assignJsonInc,
  provisionResourceAdapter,
  setEnvInfoV1ByStateV2,
  setStateV2ByConfigMapInc,
} from "../../../../src/plugins/resource/utils4v2";
import {
  MockAzureAccountProvider,
  MockM365TokenProvider,
  MockTools,
  randomAppName,
} from "../../../core/utils";
import * as path from "path";
import * as os from "os";
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
    const envInfo: v2.EnvInfoV2 = {
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
      plugin1: { k1: "", k2: "" },
      plugin2: { k2: "v2" },
    };
    setStateV2ByConfigMapInc("plugin1", provisionOutputs, config);
    assert.deepEqual(provisionOutputs["plugin1"], { k1: "v1", k2: "v2" });
  });

  it("provisionResourceAdapter", async () => {
    const tools = new MockTools();
    setTools(tools);
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
    const inputs: v2.ProvisionInputs = {
      platform: Platform.VSCode,
      projectPath: path.join(os.tmpdir(), randomAppName()),
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
    const context: v2.Context = {
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
    const envInfo: v2.EnvInfoV2 = {
      envName: "default",
      config: provisionInputConfig,
      state: {},
    };
    const tokenProvider: TokenProvider = {
      azureAccountProvider: new MockAzureAccountProvider(),
      m365TokenProvider: new MockM365TokenProvider(),
    };

    const res = await provisionResourceAdapter(context, inputs, envInfo, tokenProvider, plugin);

    assert.isTrue(res.isOk());
  });
});
