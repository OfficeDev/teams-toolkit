// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import sinon from "sinon";
import { ConfigMap, PluginContext } from "@microsoft/teamsfx-api";
import { AppStudioPlugin } from "./../../../../../src/plugins/resource/appstudio";
import { LocalCrypto } from "../../../../../src/core/crypto";
import { newEnvInfo } from "../../../../../src/core/tools";
import { getAzureProjectRoot } from "../helper";

describe("Load and Save manifest template", () => {
  const sandbox = sinon.createSandbox();
  let plugin: AppStudioPlugin;
  let ctx: PluginContext;

  beforeEach(async () => {
    plugin = new AppStudioPlugin();
    ctx = {
      root: getAzureProjectRoot(),
      envInfo: newEnvInfo(),
      config: new ConfigMap(),
      cryptoProvider: new LocalCrypto(""),
    };
  });

  afterEach(async () => {
    sandbox.restore();
  });

  it("Load and Save manifest template file", async () => {
    const loadedManifestTemplate = await plugin.loadManifest(ctx);
    chai.assert.isTrue(loadedManifestTemplate.isOk());
    if (loadedManifestTemplate.isOk()) {
      const saveManifestResult = await plugin.saveManifest(ctx, loadedManifestTemplate.value);
      chai.assert.isTrue(saveManifestResult.isOk());
    }
  });
});

describe("Add capability", () => {
  const sandbox = sinon.createSandbox();
  let plugin: AppStudioPlugin;
  let ctx: PluginContext;

  beforeEach(async () => {
    plugin = new AppStudioPlugin();
    ctx = {
      root: getAzureProjectRoot(),
      envInfo: newEnvInfo(),
      config: new ConfigMap(),
      cryptoProvider: new LocalCrypto(""),
    };
  });

  afterEach(async () => {
    sandbox.restore();
  });

  it("Check capability exceed limit: should return false", async () => {
    const result = await plugin.capabilityExceedLimit(ctx, "staticTab");
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      chai.assert.isFalse(result.value);
    }
  });

  it("Check capability exceed limit: should return true", async () => {
    const result = await plugin.capabilityExceedLimit(ctx, "configurableTab");
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      chai.assert.isTrue(result.value);
    }
  });

  it("Add static tab capability", async () => {
    const capabilities = [];
    capabilities.push({ name: "staticTab" });
    const addCapabilityResult = await plugin.addCapabilities(ctx, capabilities);
    chai.assert.isTrue(addCapabilityResult.isOk());

    const loadedManifestTemplate = await plugin.loadManifest(ctx);
    chai.assert.isTrue(loadedManifestTemplate.isOk());

    if (loadedManifestTemplate.isOk()) {
      chai.assert.equal(loadedManifestTemplate.value.local.staticTabs.length, 2);
      chai.assert.equal(loadedManifestTemplate.value.remote.staticTabs.length, 2);
    }
  });
});
