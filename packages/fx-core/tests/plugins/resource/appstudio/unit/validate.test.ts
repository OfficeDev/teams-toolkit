// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import sinon from "sinon";
import fs from "fs-extra";
import path from "path";
import { AppStudioPlugin } from "./../../../../../src/plugins/resource/appstudio";
import { TeamsBot } from "./../../../../../src/plugins/resource/bot";
import { ConfigMap, PluginContext, TeamsAppManifest, ok, Plugin } from "@microsoft/teamsfx-api";

describe("validate manifest", () => {
  let plugin: AppStudioPlugin;
  let ctx: PluginContext;
  let BotPlugin: Plugin;
  let selectedPlugins: Plugin[];

  beforeEach(async () => {
    plugin = new AppStudioPlugin();
    ctx = {
      root: "./",
      configOfOtherPlugins: new Map(),
      config: new ConfigMap(),
    };

    const botplugin: Plugin = new TeamsBot();
    BotPlugin = botplugin as Plugin;
    BotPlugin.name = "fx-resource-bot";
    BotPlugin.displayName = "Bot";
    selectedPlugins = [BotPlugin];
  });

  it("valid manifest", async () => {
    const manifestFile = path.resolve(__dirname, "./../resources/valid.manifest.json");
    const manifest = await fs.readJson(manifestFile);
    const manifestString = JSON.stringify(manifest);

    sinon.stub(plugin, "validateManifest").resolves(ok([]));

    const validationResult = await plugin.validateManifest(ctx);
    chai.assert.isTrue(validationResult.isOk());
    if (validationResult.isOk()) {
      chai.expect(validationResult.value).to.have.lengthOf(0);
    }

    sinon.restore();
  });

  it("invalid manifest", async () => {
    const manifestFile = path.resolve(__dirname, "./../resources/invalid.manifest.json");
    const manifest = await fs.readJson(manifestFile);
    const manifestString = JSON.stringify(manifest);

    sinon
      .stub(plugin, "validateManifest")
      .resolves(ok(["developer | Required properties are missing from object: []."]));

    const validationResult = await plugin.validateManifest(ctx);
    chai.assert.isTrue(validationResult.isOk());
    if (validationResult.isOk()) {
      chai.expect(validationResult.value).to.have.lengthOf(1);
    }

    sinon.restore();
  });
});
