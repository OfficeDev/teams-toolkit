// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import sinon from "sinon";
import { AppStudioPlugin } from "./../../../../../src/plugins/resource/appstudio";
import { TeamsBot } from "./../../../../../src/plugins/resource/bot";
import { ConfigMap, PluginContext, TeamsAppManifest, ok, Plugin } from "@microsoft/teamsfx-api";
import { newEnvInfo } from "../../../../../src";
import { LocalCrypto } from "../../../../../src/core/crypto";
import { AppStudioClient } from "../../../../../src/plugins/resource/appstudio/appStudio";

describe("validate manifest", () => {
  let plugin: AppStudioPlugin;
  let ctx: PluginContext;
  let BotPlugin: Plugin;
  let selectedPlugins: Plugin[];

  beforeEach(async () => {
    plugin = new AppStudioPlugin();
    ctx = {
      root: "./",
      envInfo: newEnvInfo(),
      config: new ConfigMap(),
      cryptoProvider: new LocalCrypto(""),
    };

    const botplugin: Plugin = new TeamsBot();
    BotPlugin = botplugin as Plugin;
    BotPlugin.name = "fx-resource-bot";
    BotPlugin.displayName = "Bot";
    selectedPlugins = [BotPlugin];
  });

  afterEach(async () => {
    sinon.restore();
  });

  it("valid manifest", async () => {
    sinon.stub(plugin, "validateManifest").resolves(ok([]));

    const validationResult = await plugin.validateManifest(ctx);
    chai.assert.isTrue(validationResult.isOk());
    if (validationResult.isOk()) {
      chai.expect(validationResult.value).to.have.lengthOf(0);
    }
  });

  it("invalid manifest", async () => {
    sinon
      .stub(plugin, "validateManifest")
      .resolves(ok(["developer | Required properties are missing from object: []."]));

    const validationResult = await plugin.validateManifest(ctx);
    chai.assert.isTrue(validationResult.isOk());
    if (validationResult.isOk()) {
      chai.expect(validationResult.value).to.have.lengthOf(1);
    }
  });
});
