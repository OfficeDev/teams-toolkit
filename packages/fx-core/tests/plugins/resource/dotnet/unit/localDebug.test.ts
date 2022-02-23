// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";

import * as chai from "chai";
import * as sinon from "sinon";
import fs from "fs-extra";
import { EnvInfo, LocalSettings, PluginContext } from "@microsoft/teamsfx-api";
import chaiAsPromised from "chai-as-promised";

import { FrontendPlugin as WebappPlugin } from "../../../../../src/plugins/resource/frontend";
import { TestHelper } from "../helper";
import {
  DotnetPathInfo as PathInfo,
  DotnetPluginInfo as PluginInfo,
} from "../../../../../src/plugins/resource/frontend/dotnet/constants";
import {
  LocalSettingsAuthKeys,
  LocalSettingsBotKeys,
  LocalSettingsFrontendKeys,
  LocalSettingsTeamsAppKeys,
} from "../../../../../src/common/localSettingsConstants";
import { PathLike } from "fs";
import { FRONTEND_INDEX_PATH } from "../../../../../src/plugins/resource/appstudio/constants";
import { FeatureFlagName } from "../../../../../src/common/constants";

chai.use(chaiAsPromised);

const appSettingDevelopment =
  '{TeamsFx": {"Authentication": {"ClientId": "$clientId$","ClientSecret": "$client-secret$","OAuthAuthority": "$oauthAuthority$"}';

const clientId = "clientId";
const clientSecret = "clientSecret";
const tenantId = "tenantId";
const botId = "botId";
const botPassword = "botPassword";
const expectedAppSettings = `{TeamsFx": {"Authentication": {"ClientId": "${clientId}","ClientSecret": "${clientSecret}","OAuthAuthority": "${PathInfo.oauthHost(
  tenantId
)}"}`;

const env = Object.assign({}, process.env);

describe("WebappPlugin", () => {
  describe("config unify disabled", () => {
    let plugin: WebappPlugin;
    let pluginContext: PluginContext;

    beforeEach(async () => {
      plugin = new WebappPlugin();
      pluginContext = TestHelper.getFakePluginContext();
      pluginContext.localSettings = {
        teamsApp: new Map([[LocalSettingsTeamsAppKeys.TenantId, tenantId]]),
        auth: new Map([
          [LocalSettingsAuthKeys.ClientId, clientId],
          [LocalSettingsAuthKeys.ClientSecret, clientSecret],
        ]),
        frontend: new Map([]),
        bot: new Map([
          [LocalSettingsBotKeys.BotId, botId],
          [LocalSettingsBotKeys.BotPassword, botPassword],
        ]),
      } as LocalSettings;
    });

    afterEach(() => {
      sinon.restore();
    });

    it("local debug", async () => {
      const result = await plugin.localDebug(pluginContext);
      chai.assert.isTrue(result.isOk());
      chai.assert.equal(
        pluginContext.localSettings?.frontend?.get(LocalSettingsFrontendKeys.TabIndexPath),
        PathInfo.indexPath
      );
    });

    it("post local debug", async () => {
      sinon.stub(fs, "readFile").resolves(appSettingDevelopment as any);
      sinon.stub(fs, "writeFile").callsFake((path: number | PathLike, data: any) => {
        chai.assert.equal(data, expectedAppSettings);
      });

      const result = await plugin.postLocalDebug(pluginContext);
      chai.assert.isTrue(result.isOk());
    });
  });

  describe("config unify enabled", () => {
    let plugin: WebappPlugin;
    let pluginContext: PluginContext;

    before(() => {
      process.env[FeatureFlagName.ConfigUnify] = "true";
    });

    after(() => {
      process.env = env;
    });

    beforeEach(async () => {
      plugin = new WebappPlugin();
      pluginContext = TestHelper.getFakePluginContext();
      pluginContext.envInfo = {
        envName: "test",
        state: new Map([[PluginInfo.pluginName, new Map([])]]),
      } as EnvInfo;
    });

    afterEach(() => {
      sinon.restore();
    });
    it("local debug", async () => {
      const result = await plugin.localDebug(pluginContext);
      chai.assert.isTrue(result.isOk());
    });
  });
});
