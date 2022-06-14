// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import fs from "fs-extra";
import sinon from "sinon";
import {
  ConfigMap,
  PluginContext,
  TeamsAppManifest,
  Plugin,
  ok,
  Platform,
  LocalSettings,
} from "@microsoft/teamsfx-api";
import { AppStudioPlugin } from "./../../../../../src/plugins/resource/appstudio";
import { AppStudioClient } from "./../../../../../src/plugins/resource/appstudio/appStudio";
import { AppStudioPluginImpl } from "./../../../../../src/plugins/resource/appstudio/plugin";
import { TeamsBot } from "./../../../../../src/plugins/resource/bot";
import AdmZip from "adm-zip";
import { newEnvInfo } from "../../../../../src";
import { LocalCrypto } from "../../../../../src/core/crypto";
import { getAzureProjectRoot } from "../helper";
import { v4 as uuid } from "uuid";
import {
  LocalSettingsAuthKeys,
  LocalSettingsBotKeys,
  LocalSettingsFrontendKeys,
  LocalSettingsTeamsAppKeys,
} from "../../../../../src/common/localSettingsConstants";

describe("Build Teams Package", () => {
  let plugin: AppStudioPlugin;
  let ctx: PluginContext;
  let localSettings: LocalSettings;
  let BotPlugin: Plugin;
  let selectedPlugins: Plugin[];
  const sandbox = sinon.createSandbox();

  const localDebugApplicationIdUris = "local web application info source";
  const localDebugClientId = uuid();
  const localDebugBotId = uuid();
  const localDebugBotDomain = "local debug bot domain";

  beforeEach(async () => {
    localSettings = {
      auth: new ConfigMap([
        [LocalSettingsAuthKeys.ApplicationIdUris, localDebugApplicationIdUris],
        [LocalSettingsAuthKeys.ClientId, localDebugClientId],
      ]),
      bot: new ConfigMap([
        [LocalSettingsBotKeys.BotId, localDebugBotId],
        [LocalSettingsBotKeys.BotDomain, localDebugBotDomain],
      ]),
      teamsApp: new ConfigMap([[LocalSettingsTeamsAppKeys.TeamsAppId, uuid()]]),
    };
    plugin = new AppStudioPlugin();
    ctx = {
      root: getAzureProjectRoot(),
      envInfo: newEnvInfo(),
      config: new ConfigMap(),
      answers: { platform: Platform.VSCode },
      cryptoProvider: new LocalCrypto(""),
    };
    ctx.projectSettings = {
      appName: "my app",
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
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("Check teams app id", async () => {
    sandbox.stub(AppStudioPluginImpl.prototype, "getConfigForCreatingManifest" as any).returns({
      tabEndpoint: "https://tabEndpoint",
      tabDomain: "tabDomain",
      aadId: uuid(),
      botDomain: "botDomain",
      botId: uuid(),
      webApplicationInfoResource: "webApplicationInfoResource",
      teamsAppId: uuid(),
      tabIndexPath: "/index.html#",
    });
    sandbox.stub(fs, "move").resolves();

    const builtPackage = await plugin.buildTeamsPackage(ctx, false);
    chai.assert.isTrue(builtPackage.isOk());
    if (builtPackage.isOk()) {
      chai.assert.isNotEmpty(builtPackage.value);
      const zip = new AdmZip(builtPackage.value);
      const appPackage = `${ctx.root}/appPackage`;
      zip.extractEntryTo("manifest.json", appPackage);
      const manifestFile = `${appPackage}/manifest.json`;
      chai.assert.isTrue(await fs.pathExists(manifestFile));
      await fs.remove(builtPackage.value);
      await fs.remove(manifestFile);
    }
  });

  it("Build local debug package should fail without local debug configurations", async () => {
    sandbox.stub(AppStudioPluginImpl.prototype, "getConfigForCreatingManifest" as any).returns({
      tabEndpoint: "https://tabEndpoint",
      tabDomain: "",
      aadId: "",
      botDomain: "",
      botId: "",
      webApplicationInfoResource: "",
      teamsAppId: "",
    });
    sandbox.stub(fs, "move").resolves();

    const builtPackage = await plugin.buildTeamsPackage(ctx, true);
    chai.assert.isTrue(builtPackage.isErr());
  });

  it("Build local debug package should succeed with local debug configurations", async () => {
    ctx.localSettings = localSettings;
    sandbox.stub(AppStudioPluginImpl.prototype, "getConfigForCreatingManifest" as any).returns({
      tabEndpoint: "https://tabEndpoint",
      tabDomain: "tabDomain",
      aadId: uuid(),
      botDomain: "botDomain",
      botId: uuid(),
      webApplicationInfoResource: "webApplicationInfoResource",
      teamsAppId: uuid(),
      tabIndexPath: "/index.html#",
    });
    sandbox.stub(fs, "move").resolves();

    const builtPackage = await plugin.buildTeamsPackage(ctx, true);
    console.log(builtPackage);
    chai.assert.isTrue(builtPackage.isOk());
  });
});
