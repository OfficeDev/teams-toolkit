import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { Platform, ProjectSettingsV3 } from "@microsoft/teamsfx-api";
import * as uuid from "uuid";
import * as path from "path";
import { createContextV3 } from "../../src/component/utils";
import { configLocalEnvironment, setupLocalEnvironment } from "../../src/component/debug";

chai.use(chaiAsPromised);

describe("DebugComponent", () => {
  describe("setup", () => {
    it("happy path", async () => {
      const projectSetting: ProjectSettingsV3 = {
        appName: "",
        projectId: uuid.v4(),
        programmingLanguage: "typescript",
        components: [
          {
            name: "teams-bot",
            hosting: "azure-web-app",
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
          "teams-bot": {
            siteEndPoint: "https://www.test.com",
          },
        },
      };
      const result = await setupLocalEnvironment(context, inputs, envInfo);
      chai.assert.isTrue(result.isOk());
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
            name: "teams-bot",
            hosting: "azure-web-app",
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
          },
          "app-manifest": {
            tenantId: "mockTenantId",
          },
        },
      };
      const result = await configLocalEnvironment(context, inputs, envInfo);
      chai.assert.isTrue(result.isOk());
    });
  });
});
