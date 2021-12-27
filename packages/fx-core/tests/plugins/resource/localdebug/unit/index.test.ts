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
  describe("getLocalDebugEnvs", () => {
    let pluginContext: PluginContext;
    let plugin: LocalDebugPlugin;

    beforeEach(() => {
      pluginContext = {
        root: path.resolve(__dirname, "../data/"),
        envInfo: newEnvInfo(),
        config: new Map(),
        answers: { platform: Platform.VSCode },
      } as PluginContext;
      plugin = new LocalDebugPlugin();
      fs.emptyDirSync(pluginContext.root);
    });

    it("multi-env", async () => {
      if (!isMultiEnvEnabled()) {
        // This feature only exists when insider preview is enabled
        return;
      }
      pluginContext.envInfo = newEnvInfo(
        undefined,
        undefined,
        new Map([["solution", new Map([["programmingLanguage", "javascript"]])]])
      );
      pluginContext.projectSettings = {
        appName: "",
        projectId: uuid.v4(),
        solutionSettings: {
          name: "",
          version: "",
          activeResourcePlugins: [
            "fx-resource-aad-app-for-teams",
            "fx-resource-simple-auth",
            "fx-resource-frontend-hosting",
            "fx-resource-function",
            "fx-resource-bot",
          ],
        },
      };

      const frontendEnvPath = path.resolve(__dirname, "../data/tabs/.env.teamsfx.local");
      fs.ensureFileSync(frontendEnvPath);
      fs.writeFileSync(frontendEnvPath, "FOO=FRONTEND");
      const backendEnvPath = path.resolve(__dirname, "../data/api/.env.teamsfx.local");
      fs.ensureFileSync(backendEnvPath);
      fs.writeFileSync(backendEnvPath, "FOO=BACKEND");
      const botEnvPath = path.resolve(__dirname, "../data/bot/.env.teamsfx.local");
      fs.ensureFileSync(botEnvPath);
      fs.writeFileSync(botEnvPath, "FOO=BOT");

      const localEnvs = await plugin.getLocalDebugEnvs(pluginContext);

      chai.assert.isTrue(localEnvs !== undefined);
      chai.assert.equal(localEnvs["FRONTEND_FOO"], "FRONTEND");
      chai.assert.equal(localEnvs["BACKEND_FOO"], "BACKEND");
      chai.assert.equal(localEnvs["BOT_FOO"], "BOT");
      chai.assert.isTrue(Object.keys(localEnvs).length > 3);
    });
  });
});
