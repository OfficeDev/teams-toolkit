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
  DependentPluginInfo,
  DotnetConfigInfo as ConfigInfo,
  DotnetPathInfo as PathInfo,
  DotnetPluginInfo as PluginInfo,
} from "../../../../../src/plugins/resource/frontend/dotnet/constants";
import {
  LocalSettingsAuthKeys,
  LocalSettingsFrontendKeys,
  LocalSettingsTeamsAppKeys,
} from "../../../../../src/common/localSettingsConstants";
import { PathLike } from "fs";
import { PluginNames } from "../../../../../src/plugins/solution/fx-solution/constants";
import * as core from "../../../../../src/common/tools";

chai.use(chaiAsPromised);

const appSettingDevelopment =
  '{TeamsFx": {"Authentication": {"ClientId": "$clientId$","ClientSecret": "$client-secret$","OAuthAuthority": "$oauthAuthority$"}}}';

const clientId = "clientId";
const clientSecret = "clientSecret";
const tenantId = "tenantId";
const expectedAppSettings = `{TeamsFx": {"Authentication": {"ClientId": "${clientId}","ClientSecret": "${clientSecret}","OAuthAuthority": "${PathInfo.oauthHost(
  tenantId
)}"}}}`;

describe("WebappPlugin", () => {
  describe("config unify enabled", () => {
    let plugin: WebappPlugin;
    let pluginContext: PluginContext;

    beforeEach(async () => {
      plugin = new WebappPlugin();
      pluginContext = TestHelper.getFakePluginContext();
      pluginContext.envInfo = {
        envName: "test",
        state: new Map([
          [PluginInfo.pluginName, new Map([])],
          [
            PluginNames.AAD,
            new Map([
              [DependentPluginInfo.aadClientId, clientId],
              [DependentPluginInfo.aadClientSecret, clientSecret],
            ]),
          ],
          [PluginNames.SOLUTION, new Map([[DependentPluginInfo.appTenantId, tenantId]])],
        ]),
      } as EnvInfo;
      sinon.stub(core, "isConfigUnifyEnabled").returns(true);
    });

    afterEach(() => {
      sinon.restore();
    });
    it("local debug", async () => {
      const result = await plugin.localDebug(pluginContext);
      chai.assert.isTrue(result.isOk());
      chai.assert.equal(
        pluginContext.envInfo.state.get(PluginInfo.pluginName)?.get(ConfigInfo.indexPath),
        PathInfo.indexPath
      );
    });

    it("post local debug", async () => {
      sinon.stub(fs, "pathExists").resolves(true);
      sinon.stub(fs, "readFile").resolves(appSettingDevelopment as any);
      sinon.stub(fs, "writeFile").callsFake((path: number | PathLike, data: any) => {
        chai.assert.equal(data, expectedAppSettings);
      });

      const result = await plugin.postLocalDebug(pluginContext);
      chai.assert.isTrue(result.isOk());
    });
  });
});
