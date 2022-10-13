import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { Platform } from "@microsoft/teamsfx-api";
import * as uuid from "uuid";
import * as path from "path";
import { MockTools } from "../../../core/utils";
import { setTools } from "../../../../src/core/globalVars";
import {
  configLocalEnvironment,
  generateLocalDebugSettings,
  setupLocalEnvironment,
} from "../../../../src/component/debug";
import { createContextV3 } from "../../../../src/component/utils";
chai.use(chaiAsPromised);

describe("solution.debug.provisionLocal", () => {
  const tools = new MockTools();
  setTools(tools);
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
        components: [{ name: "teams-tab" }, { name: "teams-api" }, { name: "simple-auth" }],
        programmingLanguage: "typescript",
      };
      const inputs = {
        platform: Platform.VSCode,
        projectPath: path.resolve(__dirname, `./data/${projectSetting.projectId}`),
      };
      const v2Context = createContextV3(projectSetting);
      const result = await generateLocalDebugSettings(v2Context, inputs);
      chai.assert.isTrue(result.isOk());
    });
  });

  describe("setupLocalEnvironment", () => {
    it("happy path", async () => {
      const projectSetting = {
        appName: "",
        projectId: uuid.v4(),
        solutionSettings: {
          name: "",
          version: "",
          hostType: "Azure",
          activeResourcePlugins: [],
          azureResources: ["function"],
          capabilities: ["Tab", "Bot", "MessagingExtension"],
        },
        components: [{ name: "teams-tab" }, { name: "teams-api" }, { name: "teams-bot" }],
        programmingLanguage: "typescript",
      };
      const inputs = {
        platform: Platform.VSCode,
        projectPath: path.resolve(__dirname, `./data/${projectSetting.projectId}`),
        checkerInfo: { skipNgrok: true },
      };
      const v2Context = createContextV3(projectSetting);
      const envInfo = {
        envName: "default",
        config: {
          bot: {
            siteEndpoint: "https://endpoint.com/",
          },
        },
        state: {
          solution: {},
          "fx-resource-bot": {
            siteEndPoint: "https://www.test.com",
          },
        },
      };
      v2Context.envInfo = envInfo;
      const result = await setupLocalEnvironment(v2Context, inputs);
      chai.assert.isTrue(result.isOk());
    });
  });

  describe("configLocalEnvironment", () => {
    it("happy path", async () => {
      const projectSetting = {
        appName: "",
        projectId: uuid.v4(),
        solutionSettings: {
          name: "",
          version: "",
          hostType: "Azure",
          activeResourcePlugins: [],
          azureResources: ["function"],
          capabilities: ["Tab", "Bot", "MessagingExtension"],
        },
        components: [{ name: "teams-tab" }, { name: "teams-api" }, { name: "teams-bot" }],
        programmingLanguage: "typescript",
      };
      const inputs = {
        platform: Platform.VSCode,
        projectPath: path.resolve(__dirname, `./data/${projectSetting.projectId}`),
        checkerInfo: { skipNgrok: true },
      };
      const v2Context = createContextV3(projectSetting);
      const envInfo = {
        envName: "default",
        config: {},
        state: {
          solution: {},
          "fx-resource-bot": {
            siteEndPoint: "https://www.test.com",
          },
        },
      };
      v2Context.envInfo = envInfo;
      const result = await configLocalEnvironment(v2Context, inputs);
      chai.assert.isTrue(result.isOk());
    });
  });
});
