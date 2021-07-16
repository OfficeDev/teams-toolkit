// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import fs from "fs-extra";
import path from "path";
import sinon from "sinon";
import { ConfigMap, PluginContext, TeamsAppManifest, Plugin, ok } from "@microsoft/teamsfx-api";
import { AppStudioPlugin } from "./../../../../../src/plugins/resource/appstudio";
import { AppStudioPluginImpl } from "./../../../../../src/plugins/resource/appstudio/plugin";
import { TeamsBot } from "./../../../../../src/plugins/resource/bot";

describe("Build Teams Package", () => {
  let plugin: AppStudioPlugin;
  let ctx: PluginContext;
  let BotPlugin: Plugin;
  let selectedPlugins: Plugin[];

  beforeEach(async () => {
    plugin = new AppStudioPlugin();
    ctx = {
      root: "./tests/plugins/resource/appstudio/resources/",
      configOfOtherPlugins: new Map(),
      config: new ConfigMap(),
      app: new TeamsAppManifest(),
    };
    ctx.projectSettings = {
      appName: "my app",
      currentEnv: "default",
      projectId: "project id",
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
      },
    };
    const botplugin: Plugin = new TeamsBot();
    BotPlugin = botplugin as Plugin;
    BotPlugin.name = "fx-resource-bot";
    BotPlugin.displayName = "Bot";
    selectedPlugins = [BotPlugin];
  });

  it("Build Teams Package", async () => {
    const appDirectory = path.resolve(__dirname, "./../resources/.fx");

    sinon.stub(AppStudioPluginImpl.prototype, "getConfigForCreatingManifest" as any).returns(
      ok({
        tabEndpoint: "tabEndpoint",
        tabDomain: "tabDomain",
        aadId: "aadId",
        botDomain: "botDomain",
        botId: "botId",
        webApplicationInfoResource: "webApplicationInfoResource",
      })
    );

    const builtPackage = await plugin.buildTeamsPackage(ctx, appDirectory, ok(selectedPlugins));
    chai.assert.isTrue(builtPackage.isOk());
    if (builtPackage.isOk()) {
      chai.assert.isNotEmpty(builtPackage.value);
      await fs.remove(builtPackage.value);
    }

    sinon.restore();
  });
});
