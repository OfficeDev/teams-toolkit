// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import sinon from "sinon";
import { v4 as uuid } from "uuid";
import { AppStudioPlugin } from "./../../../../../src/plugins/resource/appstudio";
import { AppStudioPluginImpl } from "./../../../../../src/plugins/resource/appstudio/plugin";
import { TeamsBot } from "./../../../../../src/plugins/resource/bot";
import { ConfigMap, PluginContext, ok, Plugin, ManifestUtil } from "@microsoft/teamsfx-api";
import { newEnvInfo } from "../../../../../src/core/environment";
import { LocalCrypto } from "../../../../../src/core/crypto";
import { getAzureProjectRoot } from "./../helper";

describe("validate manifest", () => {
  let plugin: AppStudioPlugin;
  let ctx: PluginContext;
  let BotPlugin: Plugin;
  let selectedPlugins: Plugin[];

  beforeEach(async () => {
    plugin = new AppStudioPlugin();
    ctx = {
      root: getAzureProjectRoot(),
      envInfo: newEnvInfo(),
      config: new ConfigMap(),
      cryptoProvider: new LocalCrypto(""),
    };

    const botplugin: Plugin = new TeamsBot();
    BotPlugin = botplugin as Plugin;
    BotPlugin.name = "fx-resource-bot";
    BotPlugin.displayName = "Bot";
    selectedPlugins = [BotPlugin];

    sinon.stub(AppStudioPluginImpl.prototype, "getConfigForCreatingManifest" as any).returns({
      tabEndpoint: "https://tabEndpoint",
      tabDomain: "tabDomain",
      tabIndexPath: "/index",
      aadId: uuid(),
      botDomain: "botDomain",
      botId: uuid(),
      webApplicationInfoResource: "webApplicationInfoResource",
      teamsAppId: uuid(),
    });
  });

  afterEach(async () => {
    sinon.restore();
  });

  it("valid manifest", async () => {
    sinon.stub(ManifestUtil, "validateManifest").resolves([]);

    const validationResult = await plugin.validateManifest(ctx);
    chai.assert.isTrue(validationResult.isOk());
    if (validationResult.isOk()) {
      chai.expect(validationResult.value).to.have.lengthOf(0);
    }
  });

  it("invalid manifest", async () => {
    sinon
      .stub(ManifestUtil, "validateManifest")
      .resolves(["developer | Required properties are missing from object: []."]);

    const validationResult = await plugin.validateManifest(ctx);
    chai.assert.isTrue(validationResult.isErr());
  });
});
