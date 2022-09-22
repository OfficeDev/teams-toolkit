// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
const fs = require("fs-extra");
import * as sinon from "sinon";
import * as tool from "../../../../../../src/common/tools";
import { DotnetBotImpl } from "../../../../../../src/plugins/resource/bot/dotnet/plugin";
import * as testUtils from "../utils";
import { ResourcePlugins } from "../../../../../../src/common/constants";
import { ConfigKeys } from "../../../../../../src/plugins/resource/bot/constants";
import { AzureSolutionSettings, ok } from "@microsoft/teamsfx-api";
import { PluginAAD } from "../../../../../../src/plugins/resource/bot/resources/strings";
import { RetryHandler } from "../../../../../../src/plugins/resource/bot/utils/retryHandler";
import { TeamsBot } from "../../../../../../src/plugins/resource";
import {
  BotOptionItem,
  BotSsoItem,
} from "../../../../../../src/plugins/solution/fx-solution/question";
import { BOT_ID } from "../../../../../../src/component/resource/appManifest/constants";

describe("Bot plugin for dotnet", () => {
  describe("Test PostLocalDebug", () => {
    afterEach(() => {
      sinon.restore();
    });

    let botPlugin: TeamsBot;
    let botPluginImpl: DotnetBotImpl;

    beforeEach(() => {
      botPlugin = new TeamsBot();
      botPluginImpl = new DotnetBotImpl();
      botPlugin.teamsBotImpl = botPluginImpl;
    });

    it("AAD Enabled", async () => {
      sinon.stub<any, any>(tool, "isAadManifestEnabled").returns(true);
      const pluginContext = testUtils.newPluginContext();
      pluginContext.projectSettings!.appName = "anything";
      botPluginImpl.config.localDebug.localBotId = "anything";
      botPluginImpl.config.saveConfigIntoContext(pluginContext);
      (pluginContext.projectSettings?.solutionSettings as AzureSolutionSettings).capabilities = [
        BotOptionItem.id,
        BotSsoItem.id,
      ];
      (pluginContext.projectSettings?.solutionSettings as AzureSolutionSettings).hostType = "Azure";
      pluginContext.projectSettings!.programmingLanguage = "csharp";
      pluginContext.envInfo.state.set(
        ResourcePlugins.Bot,
        new Map<string, string>([
          [ConfigKeys.SITE_ENDPOINT, "https://bot.local.endpoint"],
          [BOT_ID, "bot_id"],
        ])
      );
      pluginContext.envInfo.state.set(
        PluginAAD.PLUGIN_NAME,
        new Map<string, string>([
          [PluginAAD.APPLICATION_ID_URIS, "app_id_uri"],
          [PluginAAD.CLIENT_ID, "client_id"],
          [PluginAAD.CLIENT_SECRET, "client_secret"],
          [PluginAAD.OAUTH_AUTHORITY, "oauth_authority"],
          [PluginAAD.TENANT_ID, "tenant_id"],
        ])
      );
      sinon.stub(fs, "pathExists").resolves(false);
      sinon.stub(fs, "writeFile").callsFake((file, data, options) => {
        chai.assert.isTrue((data as string).includes("app_id_uri"));
        chai.assert.isTrue((data as string).includes("client_id"));
        chai.assert.isTrue((data as string).includes("client_secret"));
        chai.assert.isTrue((data as string).includes("oauth_authority"));
        chai.assert.isTrue((data as string).includes("tenant_id"));
        chai.assert.isTrue((data as string).includes("https://bot.local.endpoint/bot-auth-start"));
      });
      sinon.stub(RetryHandler, "Retry").resolves({});

      // Act
      const result = await botPlugin.postLocalDebug(pluginContext);
    });
  });
});
