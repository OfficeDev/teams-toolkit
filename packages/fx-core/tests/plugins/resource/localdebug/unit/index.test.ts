import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as fs from "fs-extra";
import { Platform, PluginContext } from "@microsoft/teamsfx-api";
import * as path from "path";

import { LocalDebugPluginInfo } from "../../../../../src/plugins/resource/localdebug/constants";
import { LocalDebugPlugin } from "../../../../../src/plugins/resource/localdebug";
import * as uuid from "uuid";
import { newEnvInfo } from "../../../../../src/core/tools";
import { isMultiEnvEnabled } from "../../../../../src";
chai.use(chaiAsPromised);

describe(LocalDebugPluginInfo.pluginName, () => {
  describe("postLocalDebug", () => {
    let pluginContext: PluginContext;
    let plugin: LocalDebugPlugin;

    beforeEach(() => {
      pluginContext = {
        envInfo: newEnvInfo(),
      } as PluginContext;
      plugin = new LocalDebugPlugin();
    });

    it("happy path", async () => {
      const result = await plugin.postLocalDebug(pluginContext);
      chai.assert.isTrue(result.isOk());
    });
  });
});
