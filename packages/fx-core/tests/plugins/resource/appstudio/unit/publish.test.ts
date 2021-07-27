// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import sinon from "sinon";
import fs from "fs-extra";
import path from "path";
import { v4 as uuid } from "uuid";
import {
  ConfigMap,
  PluginContext,
  ok,
  Platform,
  TeamsAppManifest,
  Plugin,
} from "@microsoft/teamsfx-api";
import { AppStudioPlugin } from "./../../../../../src/plugins/resource/appstudio";
import { AppStudioPluginImpl } from "./../../../../../src/plugins/resource/appstudio/plugin";
import { AppStudioError } from "./../../../../../src/plugins/resource/appstudio/errors";
import { AppStudioClient } from "./../../../../../src/plugins/resource/appstudio/appStudio";
import { PublishingState } from "./../../../../../src/plugins/resource/appstudio/interfaces/IPublishingAppDefinition";
import { mockTokenProvider } from "./../../aad/helper";
import { MockUserInteraction } from "./../helper";
import { TeamsBot } from "./../../../../../src/plugins/resource/bot";
import { ResourcePlugins } from "../../../../../src/plugins/solution/fx-solution/ResourcePluginContainer";
import Container from "typedi";

describe("Publish Teams app", () => {
  let plugin: AppStudioPlugin;
  let ctx: PluginContext;
  let BotPlugin: Plugin;
  let selectedPlugins: Plugin[];
  const sandbox = sinon.createSandbox();
  const appPackagePath = path.resolve(__dirname, "./../resources/.fx/appPackage.zip");

  beforeEach(async () => {
    plugin = new AppStudioPlugin();
    ctx = {
      root: path.resolve(__dirname, "./../resources"),
      configOfOtherPlugins: new Map(),
      config: new ConfigMap(),
      appStudioToken: mockTokenProvider(),
      answers: { platform: Platform.VSCode },
    };
    ctx.projectSettings = {
      appName: "my app",
      currentEnv: "default",
      projectId: "project id",
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
        activeResourcePlugins: ["fx-resource-bot"],
      },
    };
    const botplugin: Plugin = new TeamsBot();
    BotPlugin = botplugin as Plugin;
    BotPlugin.name = "fx-resource-bot";
    BotPlugin.displayName = "Bot";
    selectedPlugins = [BotPlugin];
    sandbox.stub(AppStudioClient, "validateManifest").resolves([]);
    sandbox.stub(AppStudioClient, "publishTeamsApp").resolves(uuid());
    sandbox.stub(AppStudioClient, "publishTeamsAppUpdate").resolves(uuid());
    sandbox.stub(AppStudioClient, "updateApp").resolves();
  });

  afterEach(async () => {
    sandbox.restore();
    if (await fs.pathExists(appPackagePath)) {
      await fs.remove(appPackagePath);
    }
  });

  it("Publish teams app", async () => {
    sandbox.stub(AppStudioClient, "getAppByTeamsAppId").resolves(undefined);

    sandbox.stub(AppStudioPluginImpl.prototype, "getConfigForCreatingManifest" as any).returns(
      ok({
        tabEndpoint: "tabEndpoint",
        tabDomain: "tabDomain",
        aadId: "aadId",
        botDomain: "botDomain",
        botId: "botId",
        webApplicationInfoResource: "webApplicationInfoResource",
      })
    );

    const teamsAppId = await plugin.publish(ctx);
    chai.assert.isTrue(teamsAppId.isOk());
    if (teamsAppId.isOk()) {
      chai.assert.isNotEmpty(teamsAppId.value);
    }
  });

  it("Update a submitted app", async () => {
    const mockApp = {
      lastModifiedDateTime: null,
      publishingState: PublishingState.submitted,
      teamsAppId: uuid(),
      displayName: "TestApp",
    };
    sandbox.stub(AppStudioClient, "getAppByTeamsAppId").resolves(mockApp);
    ctx.ui = new MockUserInteraction();

    sandbox.stub(AppStudioPluginImpl.prototype, "getConfigForCreatingManifest" as any).returns(
      ok({
        tabEndpoint: "tabEndpoint",
        tabDomain: "tabDomain",
        aadId: "aadId",
        botDomain: "botDomain",
        botId: "botId",
        webApplicationInfoResource: "webApplicationInfoResource",
      })
    );

    const teamsAppId = await plugin.publish(ctx);
    chai.assert.isTrue(teamsAppId.isOk());
    if (teamsAppId.isOk()) {
      chai.assert.isNotEmpty(teamsAppId.value);
    }
  });
});
