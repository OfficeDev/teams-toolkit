import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { Platform } from "@microsoft/teamsfx-api";
import * as uuid from "uuid";
import { MockedV2Context } from "../util";
import {
  setupLocalDebugSettings,
  configLocalDebugSettings,
} from "../../../../src/plugins/solution/fx-solution/debug/provisionLocal";
import * as path from "path";
chai.use(chaiAsPromised);

describe("solution.debug.provisionLocal", () => {
  describe("setupLocalDebugSettings", () => {
    it("happy path", async () => {
      const projectSetting = {
        appName: "",
        projectId: uuid.v4(),
        solutionSettings: {
          name: "fx-solution-azure",
          hostType: "Azure",
          capabilities: ["Tab"],
          azureResources: ["function"],
          activeResourcePlugins: ["fx-resource-simple-auth"],
        },
        programmingLanguage: "typescript",
      };
      const inputs = {
        platform: Platform.VSCode,
        projectPath: path.resolve(__dirname, `./data/${projectSetting.projectId}`),
      };
      const v2Context = new MockedV2Context(projectSetting);
      const result = await setupLocalDebugSettings(v2Context, inputs, {
        auth: {},
        frontend: {},
        backend: {},
      });
      chai.assert.isTrue(result.isOk());
    });

    it("partial local settings", async () => {
      const projectSetting = {
        appName: "",
        projectId: uuid.v4(),
        solutionSettings: {
          name: "fx-solution-azure",
          hostType: "Azure",
          capabilities: ["Tab"],
          azureResources: ["function"],
          activeResourcePlugins: ["fx-resource-simple-auth"],
        },
        programmingLanguage: "typescript",
      };
      const inputs = {
        platform: Platform.VSCode,
        projectPath: path.resolve(__dirname, `./data/${projectSetting.projectId}`),
      };
      const v2Context = new MockedV2Context(projectSetting);
      const localSettings = {
        foo: {},
        bar: {},
      } as any;
      const result = await setupLocalDebugSettings(v2Context, inputs, localSettings);
      chai.assert.isTrue(result.isOk());
      chai.assert.isDefined(localSettings.auth);
      chai.assert.isDefined(localSettings.frontend);
      chai.assert.isDefined(localSettings.backend);
    });
  });

  describe("configLocalDebugSettings", () => {
    it("happy path", async () => {
      const projectSetting = {
        appName: "",
        projectId: uuid.v4(),
        solutionSettings: {
          name: "",
          version: "",
          activeResourcePlugins: [],
        },
        programmingLanguage: "typescript",
      };
      const inputs = {
        platform: Platform.VSCode,
        projectPath: path.resolve(__dirname, `./data/${projectSetting.projectId}`),
      };
      const v2Context = new MockedV2Context(projectSetting);
      const result = await configLocalDebugSettings(v2Context, inputs, {
        teamsApp: {},
        auth: {},
        frontend: {},
        backend: {},
      });
      chai.assert.isTrue(result.isOk());
    });
  });
});
