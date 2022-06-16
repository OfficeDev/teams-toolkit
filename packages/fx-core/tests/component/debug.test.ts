import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { Platform, ProjectSettingsV3 } from "@microsoft/teamsfx-api";
import * as uuid from "uuid";
import * as path from "path";
import { createContextV3 } from "../../src/component/utils";
import { configLocalEnvironment, setupLocalEnvironment } from "../../src/component/debug";
import { MockTools } from "../core/utils";
import { setTools } from "../../src/core/globalVars";
import { ComponentNames } from "../../src/component/constants";

chai.use(chaiAsPromised);

describe("DebugComponent", () => {
  const tools = new MockTools();
  setTools(tools);
  describe("setup", () => {
    it("happy path", async () => {
      const projectSetting: ProjectSettingsV3 = {
        appName: "",
        projectId: uuid.v4(),
        programmingLanguage: "typescript",
        components: [
          {
            name: ComponentNames.TeamsBot,
            hosting: ComponentNames.Function,
          },
          {
            name: ComponentNames.TeamsTab,
            hosting: ComponentNames.AzureStorage,
          },
          {
            name: ComponentNames.Function,
          },
          {
            name: ComponentNames.AadApp,
          },
        ],
      };
      const inputs = {
        platform: Platform.VSCode,
        projectPath: path.resolve(__dirname, `./data/${projectSetting.projectId}`),
        checkerInfo: { skipNgrok: true },
      };
      const context = createContextV3(projectSetting);
      const envInfo = {
        envName: "default",
        config: {
          bot: {
            siteEndpoint: "https://endpoint.com/",
          },
        },
        state: {
          solution: {},
          [ComponentNames.TeamsBot]: {
            siteEndPoint: "https://www.test.com",
          },
        },
      };
      const result = await setupLocalEnvironment(context, inputs, envInfo);
      chai.assert.isTrue(result.isOk());
      console.log(envInfo.state);
    });
  });

  describe("config", () => {
    it("happy path", async () => {
      const projectSetting: ProjectSettingsV3 = {
        appName: "",
        projectId: uuid.v4(),
        programmingLanguage: "typescript",
        components: [
          {
            name: ComponentNames.TeamsBot,
            hosting: ComponentNames.Function,
          },
          {
            name: ComponentNames.TeamsTab,
            hosting: ComponentNames.AzureStorage,
          },
          {
            name: ComponentNames.Function,
          },
          {
            name: ComponentNames.AadApp,
          },
        ],
      };
      const inputs = {
        platform: Platform.VSCode,
        projectPath: path.resolve(__dirname, `./data/${projectSetting.projectId}`),
        checkerInfo: { skipNgrok: true },
      };
      const context = createContextV3(projectSetting);
      const envInfo = {
        envName: "default",
        config: {},
        state: {
          solution: {},
          "teams-bot": {
            siteEndPoint: "https://www.test.com",
            siteEndpoint: "https://endpoint.com/",
            validDomain: "endpoint.com/",
          },
          "simple-auth": {},
          "teams-tab": { endpoint: "https://localhost:53000", domain: "localhost" },
          function: { functionEndpoint: "http://localhost:7071" },
          [ComponentNames.AppManifest]: {
            tenantId: "mockTenantId",
          },
        },
      };
      const result = await configLocalEnvironment(context, inputs, envInfo);
      chai.assert.isTrue(result.isOk());
    });
  });
});
